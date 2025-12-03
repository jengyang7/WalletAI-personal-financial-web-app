// Supabase Edge Function to record monthly stats for all users
// This runs automatically on the last day of each month via Supabase scheduled functions
// See: https://supabase.com/docs/guides/functions/scheduled-functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the last day of the previous month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    const targetMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users who have financial data
    const { data: users, error: usersError } = await supabase
      .from('assets')
      .select('user_id')
      .union(
        supabase.from('holdings').select('user_id'),
        supabase.from('expenses').select('user_id'),
        supabase.from('income').select('user_id')
      );

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users?.map((u: any) => u.user_id) || [])];

    console.log(`Recording monthly stats for ${uniqueUserIds.length} users for month ${targetMonth.toISOString().split('T')[0]}`);

    let successCount = 0;
    let errorCount = 0;

    // Record stats for each user
    for (const userId of uniqueUserIds) {
      try {
        // Calculate net worth (assets + portfolio)
        const { data: assets } = await supabase
          .from('assets')
          .select('amount')
          .eq('user_id', userId);

        const { data: holdings } = await supabase
          .from('holdings')
          .select('shares, current_price, average_price')
          .eq('user_id', userId);

        let totalNetWorth = 0;
        if (assets) {
          totalNetWorth = assets.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        }

        let totalPortfolioValue = 0;
        if (holdings) {
          totalPortfolioValue = holdings.reduce((sum, h) => {
            const price = h.current_price || h.average_price || 0;
            return sum + (h.shares * price);
          }, 0);
        }

        // Net worth includes both assets and portfolio
        totalNetWorth = totalNetWorth + totalPortfolioValue;

        // Get latest transaction update
        const { data: expenses } = await supabase
          .from('expenses')
          .select('updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);

        const { data: income } = await supabase
          .from('income')
          .select('updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);

        const { data: assetsUpdate } = await supabase
          .from('assets')
          .select('updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);

        const lastUpdate = Math.max(
          expenses?.[0]?.updated_at ? new Date(expenses[0].updated_at).getTime() : 0,
          income?.[0]?.updated_at ? new Date(income[0].updated_at).getTime() : 0,
          assetsUpdate?.[0]?.updated_at ? new Date(assetsUpdate[0].updated_at).getTime() : 0
        );

        // Insert or update monthly stats
        const { error: insertError } = await supabase
          .from('monthly_stats')
          .upsert({
            user_id: userId,
            month: targetMonth.toISOString().split('T')[0],
            total_net_worth: totalNetWorth,
            total_portfolio_value: totalPortfolioValue,
            last_transaction_update: lastUpdate > 0 ? new Date(lastUpdate).toISOString() : null,
            recorded_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,month'
          });

        if (insertError) {
          console.error(`Error recording stats for user ${userId}:`, insertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recorded monthly stats for ${successCount} users, ${errorCount} errors`,
        targetMonth: targetMonth.toISOString().split('T')[0],
        successCount,
        errorCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in record-monthly-stats function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});


