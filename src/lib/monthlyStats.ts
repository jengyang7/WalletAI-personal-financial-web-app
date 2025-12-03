import { supabase } from './supabase';

/**
 * Records monthly stats for the current month
 * Call this function:
 * - At the end of each month (via cron job or scheduled task)
 * - When user manually requests a snapshot
 * - After bulk transaction imports
 */
export async function recordMonthlyStats(userId: string, targetMonth?: Date) {
  try {
    const month = targetMonth || new Date();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    
    // Calculate current net worth from assets
    const { data: assetsData } = await supabase
      .from('assets')
      .select('amount, currency')
      .eq('user_id', userId);
    
    let totalAssets = 0;
    if (assetsData) {
      totalAssets = assetsData.reduce((sum, asset) => sum + (parseFloat(asset.amount) || 0), 0);
    }
    
    // Calculate portfolio value from holdings
    const { data: holdingsData } = await supabase
      .from('holdings')
      .select('shares, current_price, average_price, currency')
      .eq('user_id', userId);
    
    let totalPortfolioValue = 0;
    if (holdingsData) {
      totalPortfolioValue = holdingsData.reduce((sum, holding) => {
        const price = holding.current_price || holding.average_price || 0;
        return sum + (holding.shares * price);
      }, 0);
    }
    
    // Net worth includes both assets AND portfolio value
    const totalNetWorth = totalAssets + totalPortfolioValue;
    
    // Get the latest update timestamp from transactions
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const { data: incomeData } = await supabase
      .from('income')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const { data: assetsUpdateData } = await supabase
      .from('assets')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const lastUpdate = Math.max(
      expensesData?.[0]?.updated_at ? new Date(expensesData[0].updated_at).getTime() : 0,
      incomeData?.[0]?.updated_at ? new Date(incomeData[0].updated_at).getTime() : 0,
      assetsUpdateData?.[0]?.updated_at ? new Date(assetsUpdateData[0].updated_at).getTime() : 0
    );
    
    // Insert or update monthly stats
    const { error } = await supabase
      .from('monthly_stats')
      .upsert({
        user_id: userId,
        month: monthStart.toISOString().split('T')[0],
        total_net_worth: totalNetWorth,
        total_portfolio_value: totalPortfolioValue,
        last_transaction_update: lastUpdate > 0 ? new Date(lastUpdate).toISOString() : null,
        recorded_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,month'
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error recording monthly stats:', error);
    throw error;
  }
}

/**
 * Recalculates monthly stats for all months that have transactions
 * Use this when you want to refresh historical data after bulk edits
 */
export async function recalculateAllMonthlyStats(userId: string) {
  try {
    // Get all unique months from expenses, income, and assets
    const { data: expenses } = await supabase
      .from('expenses')
      .select('date')
      .eq('user_id', userId);
    
    const { data: income } = await supabase
      .from('income')
      .select('date')
      .eq('user_id', userId);
    
    const { data: assets } = await supabase
      .from('assets')
      .select('created_at')
      .eq('user_id', userId);
    
    const months = new Set<string>();
    
    // Add months from expenses
    expenses?.forEach(exp => {
      const date = new Date(exp.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    // Add months from income
    income?.forEach(inc => {
      const date = new Date(inc.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    // Add months from assets
    assets?.forEach(asset => {
      const date = new Date(asset.created_at || new Date());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    // Record stats for each month
    for (const monthKey of months) {
      const [year, month] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, month - 1, 1);
      await recordMonthlyStats(userId, monthDate);
    }
    
    return { success: true, monthsProcessed: months.size };
  } catch (error) {
    console.error('Error recalculating monthly stats:', error);
    throw error;
  }
}

