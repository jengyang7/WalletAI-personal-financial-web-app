import { supabase } from './supabase';
import { convertCurrency } from './currencyConversion';

const normalizeCurrencyCode = (code?: string) => {
  if (!code) return 'USD';
  const upper = code.toUpperCase();
  if (upper === 'RM') return 'MYR';
  if (upper === '$') return 'USD';
  if (upper === '€') return 'EUR';
  if (upper === '£') return 'GBP';
  if (upper === '¥') return 'JPY';
  return upper;
};

// Gemini Function Declarations
const functions = [
  {
    name: 'get_expenses',
    description: 'Retrieve user expenses with optional filters for category, date range, or amount. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by expense category (e.g., "Food & Dining", "Transportation", "Shopping")',
          enum: ['Food & Dining', 'Transportation', 'Groceries', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Housing', 'Personal Care', 'Miscellaneous']
        },
        start_date: {
          type: 'string',
          description: 'Start date for filtering expenses (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          description: 'End date for filtering expenses (YYYY-MM-DD format)'
        },
        min_amount: {
          type: 'number',
          description: 'Minimum expense amount'
        },
        max_amount: {
          type: 'number',
          description: 'Maximum expense amount'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of expenses to return (default: 50)'
        },
        sort_by: {
          type: 'string',
          description: 'Sort expenses by field',
          enum: ['date', 'amount', 'category']
        },
        sort_order: {
          type: 'string',
          description: 'Sort order',
          enum: ['asc', 'desc']
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'get_budget',
    description: 'Get budget information for a specific category or all budgets. IMPORTANT: Always pass the month parameter to ensure you check the correct time period. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Specific budget category to retrieve'
        },
        include_spent: {
          type: 'boolean',
          description: 'Include amount spent against budget (default: true)'
        },
        month: {
          type: 'string',
          description: 'REQUIRED: Month to calculate spent amount for (YYYY-MM format). ALWAYS provide this parameter. Examples: "2024-11", "2025-11", "2024-10".'
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      },
      required: ['month']
    }
  },
  {
    name: 'create_expense',
    description: 'Add a new expense to track spending',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Expense amount'
        },
        description: {
          type: 'string',
          description: 'Description of the expense'
        },
        category: {
          type: 'string',
          description: 'Expense category',
          enum: ['Food & Dining', 'Transportation', 'Groceries', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Housing', 'Personal Care', 'Miscellaneous']
        },
        date: {
          type: 'string',
          description: 'Date of expense (YYYY-MM-DD format, defaults to today)'
        },
        currency: {
          type: 'string',
          description: 'Currency code (default: user default currency)',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      },
      required: ['amount', 'description', 'category']
    }
  },
  {
    name: 'create_budget',
    description: 'Create or update a budget for a specific category',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Budget category'
        },
        amount: {
          type: 'number',
          description: 'Budget amount'
        },
        currency: {
          type: 'string',
          description: 'Currency code (default: user default currency)',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      },
      required: ['category', 'amount']
    }
  },
  {
    name: 'get_spending_summary',
    description: 'Get detailed spending analysis with breakdown by category and comparison with previous period. ALWAYS use group_by: "category" and include_comparison: true to provide comprehensive insights. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for summary',
          enum: ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'all_time']
        },
        group_by: {
          type: 'string',
          description: 'Group summary by field',
          enum: ['category', 'date', 'month']
        },
        include_comparison: {
          type: 'boolean',
          description: 'Include comparison with previous period (default: false)'
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'search_transactions',
    description: 'Search expenses and income by description or other text fields. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text'
        },
        type: {
          type: 'string',
          description: 'Transaction type to search',
          enum: ['expense', 'income', 'both']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)'
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_income',
    description: 'Retrieve user income records with optional filters. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Filter by income source (e.g., "Salary", "Freelance", "Investment")'
        },
        start_date: {
          type: 'string',
          description: 'Start date for filtering (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          description: 'End date for filtering (YYYY-MM-DD format)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return (default: 50)'
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'get_subscriptions',
    description: 'Get active subscriptions and recurring expenses. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        is_active: {
          type: 'boolean',
          description: 'Filter by active status (default: true)'
        },
        upcoming_days: {
          type: 'number',
          description: 'Show subscriptions due in next N days'
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'get_portfolio',
    description: 'Get investment portfolio summary including total value, cost, gain/loss, and overall performance. Can return data in a specific currency.',
    parameters: {
      type: 'object',
      properties: {
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'get_holdings',
    description: 'Get detailed information about individual investment holdings including stocks, crypto, ETFs, etc.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Filter by specific symbol (e.g., AAPL, BTC-USD)'
        },
        asset_class: {
          type: 'string',
          description: 'Filter by asset class',
          enum: ['stock', 'crypto', 'bond', 'etf', 'mutual_fund', 'real_estate', 'commodities']
        },
        display_currency: {
          type: 'string',
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  }
];

// Helper: Get user currency
async function getUserCurrency(userId: string): Promise<string> {
  // Prefer user_settings currency
  const { data: settings } = await supabase
    .from('user_settings')
    .select('currency')
    .eq('user_id', userId)
    .single();

  if (settings?.currency) {
    return normalizeCurrencyCode(settings.currency);
  }

  // Fallback to profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', userId)
    .single();

  return normalizeCurrencyCode(profile?.currency);
}

// Function implementations
async function executeFunction(functionName: string, args: Record<string, unknown>, userId: string, userCurrency: string = 'USD'): Promise<Record<string, unknown>> {
  try {
    // Allow AI to override currency via args.display_currency
    // This enables users to ask "Show me in USD" even if their default is MYR
    const targetCurrency = args.display_currency ? normalizeCurrencyCode(args.display_currency as string) : userCurrency;

    switch (functionName) {
      case 'get_expenses':
        return await getExpenses(userId, args, targetCurrency);
      
      case 'get_budget':
        return await getBudget(userId, args, targetCurrency);
      
      case 'create_expense':
        return await createExpense(userId, args, userCurrency);
      
      case 'create_budget':
        return await createBudget(userId, args, userCurrency);
      
      case 'get_spending_summary':
        return await getSpendingSummary(userId, args, targetCurrency);
      
      case 'search_transactions':
        return await searchTransactions(userId, args, targetCurrency);
      
      case 'get_income':
        return await getIncome(userId, args, targetCurrency);
      
      case 'get_subscriptions':
        return await getSubscriptions(userId, args, targetCurrency);
      
      case 'get_portfolio':
        return await getPortfolio(userId, args, targetCurrency);
      
      case 'get_holdings':
        return await getHoldings(userId, args, targetCurrency);
      
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    throw error;
  }
}

// Function: Get Expenses
async function getExpenses(userId: string, params: Record<string, unknown>, userCurrency: string) {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId);

  if (params.category) {
    query = query.eq('category', params.category as string);
  }

  if (params.start_date) {
    query = query.gte('date', params.start_date as string);
  }

  if (params.end_date) {
    query = query.lte('date', params.end_date as string);
  }

  if (params.min_amount) {
    query = query.gte('amount', params.min_amount as number);
  }

  if (params.max_amount) {
    query = query.lte('amount', params.max_amount as number);
  }

  if (params.sort_by) {
    query = query.order(params.sort_by as string, { ascending: params.sort_order === 'asc' });
  } else {
    query = query.order('date', { ascending: false });
  }

  if (params.limit) {
    query = query.limit(params.limit as number);
  } else {
    query = query.limit(50);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calculate total in user's currency
  const total = data?.reduce((sum, e) => {
    return sum + convertCurrency(e.amount, e.currency || 'USD', userCurrency);
  }, 0) || 0;

  return {
    expenses: data,
    count: data?.length || 0,
    total: Math.round(total * 100) / 100,
    currency: userCurrency
  };
}

// Function: Get Budget
async function getBudget(userId: string, params: Record<string, unknown>, userCurrency: string) {
  let query = supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId);

  if (params.category) {
    query = query.eq('category', params.category as string);
  }

  const { data: budgets, error } = await query;

  if (error) throw error;

  if (params.include_spent !== false) {
    // Calculate spent amount for each budget
    // Use provided month or default to current month
    const targetMonth = params.month || new Date().toISOString().slice(0, 7);
    
    // Calculate the last day of the month properly (handles 28, 29, 30, 31 days)
    const [year, month] = (targetMonth as string).split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); // Gets last day of the month
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;
    
    console.log(`[get_budget] Calculating spent for month: ${targetMonth} (${startDate} to ${endDate})`);
    console.log(`[get_budget] params.month provided: ${params.month}`);
    
    const budgetsWithSpent = await Promise.all(
      (budgets || []).map(async (budget) => {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, currency, date, description')
          .eq('user_id', userId)
          .eq('category', budget.category)
          .gte('date', startDate)
          .lte('date', endDate);
        
        console.log(`[get_budget] ${budget.category}: Found ${expenses?.length || 0} expenses for ${targetMonth}`, expenses);

        // Calculate spent in the budget's native currency
        const spentNative = expenses?.reduce((sum, e) => {
          return sum + convertCurrency(e.amount, e.currency || 'USD', budget.currency || 'USD');
        }, 0) || 0;
        
        const remainingNative = budget.allocated_amount - spentNative;
        const percentUsed = (spentNative / budget.allocated_amount) * 100;

        // Convert everything to user's preferred currency for the response
        const allocatedUser = convertCurrency(budget.allocated_amount, budget.currency || 'USD', userCurrency);
        const spentUser = convertCurrency(spentNative, budget.currency || 'USD', userCurrency);
        const remainingUser = convertCurrency(remainingNative, budget.currency || 'USD', userCurrency);

        return {
          ...budget,
          // Native values (for reference/debugging)
          native_currency: budget.currency || 'USD',
          native_allocated: budget.allocated_amount,
          native_spent: spentNative,
          native_remaining: remainingNative,
          
          // User preferred currency values (for AI response)
          currency: userCurrency,
          allocated_amount: Math.round(allocatedUser * 100) / 100,
          spent: Math.round(spentUser * 100) / 100,
          remaining: Math.round(remainingUser * 100) / 100,
          percentUsed: Math.round(percentUsed),
          month: targetMonth
        };
      })
    );

    return { 
      budgets: budgetsWithSpent,
      month: targetMonth,
      note: `Spent amounts calculated for ${targetMonth}`
    };
  }

  // Even without include_spent, we should convert allocated amount to user currency
  const convertedBudgets = budgets?.map(budget => ({
    ...budget,
    native_currency: budget.currency || 'USD',
    native_allocated: budget.allocated_amount,
    currency: userCurrency,
    allocated_amount: Math.round(convertCurrency(budget.allocated_amount, budget.currency || 'USD', userCurrency) * 100) / 100
  }));

  return { budgets: convertedBudgets };
}

// Function: Create Expense
async function createExpense(userId: string, params: Record<string, unknown>, userCurrency: string) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      amount: params.amount,
      description: params.description,
      category: params.category,
      date: params.date || new Date().toISOString().split('T')[0],
      currency: params.currency || userCurrency // Use user currency as default
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    expense: data,
    message: `Added expense: ${params.description} - ${params.amount} ${data.currency}`
  };
}

// Function: Create Budget
async function createBudget(userId: string, params: Record<string, unknown>, userCurrency: string) {
  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: userId,
      category: params.category,
      name: params.category,
      allocated_amount: params.amount,
      currency: params.currency || userCurrency // Use user currency as default
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    budget: data,
    message: `Created budget: ${params.category} - ${params.amount} ${data.currency}`
  };
}

// Function: Get Spending Summary
async function getSpendingSummary(userId: string, params: Record<string, unknown>, userCurrency: string) {
  const period = (params.period as string) || 'this_month';
  const { start_date, end_date } = getPeriodDates(period);

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start_date)
    .lte('date', end_date);

  if (error) throw error;

  // Calculate total in user currency
      const total = expenses?.reduce((sum, e) => {
    return sum + convertCurrency(e.amount, e.currency || 'USD', userCurrency);
  }, 0) || 0;

  const summary: Record<string, unknown> = {
    period,
    start_date,
    end_date,
    total: Math.round(total * 100) / 100,
    currency: userCurrency,
    count: expenses?.length || 0
  };

  if (params.group_by === 'category') {
    const byCategory = expenses?.reduce((acc: Record<string, { total: number; count: number; currency: string }>, e) => {
      if (!acc[e.category]) {
        acc[e.category] = { total: 0, count: 0, currency: userCurrency };
      }
      // Convert each expense to user currency before adding
      acc[e.category].total += convertCurrency(e.amount, e.currency || 'USD', userCurrency);
      acc[e.category].count += 1;
      return acc;
    }, {});

    // Round totals
    Object.keys(byCategory || {}).forEach(cat => {
      byCategory[cat].total = Math.round(byCategory[cat].total * 100) / 100;
    });

    summary.by_category = byCategory;
  }

  if (params.include_comparison) {
    const { start_date: prev_start, end_date: prev_end } = getPreviousPeriodDates(period);
    
    const { data: prevExpenses } = await supabase
      .from('expenses')
      .select('amount, currency')
      .eq('user_id', userId)
      .gte('date', prev_start)
      .lte('date', prev_end);

    const prevTotal = prevExpenses?.reduce((sum, e) => {
      return sum + convertCurrency(e.amount, e.currency || 'USD', userCurrency);
    }, 0) || 0;
    
    const change = total - prevTotal;
    const changePercent = prevTotal > 0 ? ((change / prevTotal) * 100) : 0;

    summary.comparison = {
      previous_total: Math.round(prevTotal * 100) / 100,
      change: Math.round(change * 100) / 100,
      change_percent: Math.round(changePercent * 10) / 10
    };
  }

  return summary;
}

// Function: Search Transactions
async function searchTransactions(userId: string, params: Record<string, unknown>, userCurrency: string) {
  const results: { expenses: unknown[]; income: unknown[] } = { expenses: [], income: [] };

  if (params.type !== 'income') {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .ilike('description', `%${params.query ?? ''}%`)
      .limit(typeof params.limit === 'number' ? params.limit : 20);

    // Add converted amount for reference
    results.expenses = expenses?.map(e => ({
      ...e,
      converted_amount: Math.round(convertCurrency(e.amount, e.currency || 'USD', userCurrency) * 100) / 100,
      display_currency: userCurrency
    })) || [];
  }

  if (params.type !== 'expense') {
    const { data: income } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', userId)
      .ilike('description', `%${params.query ?? ''}%`)
      .limit(typeof params.limit === 'number' ? params.limit : 20);

    results.income = income?.map(i => ({
      ...i,
      converted_amount: Math.round(convertCurrency(i.amount, i.currency || 'USD', userCurrency) * 100) / 100,
      display_currency: userCurrency
    })) || [];
  }

  return {
    results,
    total_found: results.expenses.length + results.income.length
  };
}

// Function: Get Income
async function getIncome(userId: string, params: Record<string, unknown>, userCurrency: string) {
  let query = supabase
    .from('income')
    .select('*')
    .eq('user_id', userId);

  if (params.source) {
    query = query.eq('source', params.source as string);
  }

  if (params.start_date) {
    query = query.gte('date', params.start_date as string);
  }

  if (params.end_date) {
    query = query.lte('date', params.end_date as string);
  }

  query = query.order('date', { ascending: false });
  query = query.limit((params.limit as number) || 50);

  const { data, error } = await query;

  if (error) throw error;

  // Calculate total in user currency
  const total = data?.reduce((sum, i) => {
    return sum + convertCurrency(i.amount, i.currency || 'USD', userCurrency);
  }, 0) || 0;

  return {
    income: data,
    count: data?.length || 0,
    total: Math.round(total * 100) / 100,
    currency: userCurrency
  };
}

// Function: Get Subscriptions
async function getSubscriptions(userId: string, params: Record<string, unknown>, userCurrency: string) {
  let query = supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (params.is_active !== undefined) {
    query = query.eq('is_active', params.is_active as boolean);
  }

  if (params.upcoming_days) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + (params.upcoming_days as number));

    query = query
      .gte('next_billing_date', today.toISOString().split('T')[0])
      .lte('next_billing_date', futureDate.toISOString().split('T')[0]);
  }

  query = query.order('next_billing_date', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;

  // Calculate total monthly in user currency
  const totalMonthly = data?.filter(s => s.billing_cycle === 'monthly').reduce((sum, s) => {
    return sum + convertCurrency(s.amount, s.currency || 'USD', userCurrency);
  }, 0) || 0;

  return {
    subscriptions: data,
    count: data?.length || 0,
    total_monthly: Math.round(totalMonthly * 100) / 100,
    currency: userCurrency
  };
}

// Helper: Get period dates
function getPeriodDates(period: string): { start_date: string; end_date: string } {
  const now = new Date();
  let start_date: Date;
  let end_date: Date = now;

  switch (period) {
    case 'today':
      start_date = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'this_week':
      start_date = new Date(now);
      start_date.setDate(now.getDate() - now.getDay());
      break;
    case 'this_month':
      start_date = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      start_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end_date = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_year':
      start_date = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all_time':
      start_date = new Date('2020-01-01');
      break;
    default:
      start_date = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    start_date: start_date.toISOString().split('T')[0],
    end_date: end_date.toISOString().split('T')[0]
  };
}

// Helper: Get previous period dates
function getPreviousPeriodDates(period: string): { start_date: string; end_date: string } {
  const now = new Date();
  let start_date: Date;
  let end_date: Date;

  switch (period) {
    case 'this_month':
      start_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end_date = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_year':
      start_date = new Date(now.getFullYear() - 1, 0, 1);
      end_date = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      start_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end_date = new Date(now.getFullYear(), now.getMonth(), 0);
  }

  return {
    start_date: start_date.toISOString().split('T')[0],
    end_date: end_date.toISOString().split('T')[0]
  };
}

// Function: Get Portfolio Summary
async function getPortfolio(userId: string, params: Record<string, unknown>, userCurrency: string) {
  const { data: holdings, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  if (!holdings || holdings.length === 0) {
    return {
      message: 'No investment holdings found',
      total_value: 0,
      total_cost: 0,
      total_gain_loss: 0,
      percentage_change: 0,
      holdings_count: 0,
      currency: userCurrency
    };
  }

  // Calculate portfolio statistics
  let totalValue = 0;
  let totalCost = 0;

  for (const holding of holdings) {
    const currentPrice = holding.current_price || holding.average_price;
    const valueInHoldingCurrency = holding.shares * currentPrice;
    const costInHoldingCurrency = holding.shares * holding.average_price;
    
    // Convert to user currency
    totalValue += convertCurrency(valueInHoldingCurrency, holding.currency || 'USD', userCurrency);
    totalCost += convertCurrency(costInHoldingCurrency, holding.currency || 'USD', userCurrency);
  }

  const totalGainLoss = totalValue - totalCost;
  const percentageChange = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

  // Group by asset class
  const byAssetClass: Record<string, number> = {};
  for (const holding of holdings) {
    const assetClass = holding.asset_class || 'stock';
    const currentPrice = holding.current_price || holding.average_price;
    const valueInHoldingCurrency = holding.shares * currentPrice;
    const valueInUserCurrency = convertCurrency(valueInHoldingCurrency, holding.currency || 'USD', userCurrency);
    byAssetClass[assetClass] = (byAssetClass[assetClass] || 0) + valueInUserCurrency;
  }

  return {
    total_value: Math.round(totalValue * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    total_gain_loss: Math.round(totalGainLoss * 100) / 100,
    percentage_change: Math.round(percentageChange * 10) / 10,
    holdings_count: holdings.length,
    by_asset_class: Object.entries(byAssetClass).map(([name, value]) => ({
      asset_class: name,
      value: Math.round(value * 100) / 100,
      percentage: totalValue > 0 ? Math.round((value / totalValue) * 1000) / 10 : 0
    })),
    currency: userCurrency
  };
}

// Function: Get Holdings
async function getHoldings(userId: string, params: Record<string, unknown>, userCurrency: string) {
  let query = supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (params.symbol) {
    query = query.eq('symbol', (params.symbol as string).toUpperCase());
  }

  if (params.asset_class) {
    query = query.eq('asset_class', params.asset_class as string);
  }

  query = query.order('symbol', { ascending: true });

  const { data: holdings, error } = await query;

  if (error) throw error;

  // Enrich each holding with calculated values
  const enrichedHoldings = holdings?.map(holding => {
    const currentPrice = holding.current_price || holding.average_price;
    const totalValue = holding.shares * currentPrice;
    const totalCost = holding.shares * holding.average_price;
    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? ((gainLoss / totalCost) * 100) : 0;

    // Convert to user currency
    const valueInUserCurrency = convertCurrency(totalValue, holding.currency || 'USD', userCurrency);
    const costInUserCurrency = convertCurrency(totalCost, holding.currency || 'USD', userCurrency);
    const gainLossInUserCurrency = valueInUserCurrency - costInUserCurrency;

    return {
      symbol: holding.symbol,
      asset_class: holding.asset_class || 'stock',
      shares: holding.shares,
      average_price: holding.average_price,
      current_price: currentPrice,
      native_currency: holding.currency || 'USD',
      total_value: Math.round(valueInUserCurrency * 100) / 100,
      total_cost: Math.round(costInUserCurrency * 100) / 100,
      gain_loss: Math.round(gainLossInUserCurrency * 100) / 100,
      gain_loss_percent: Math.round(gainLossPercent * 10) / 10,
      display_currency: userCurrency,
      last_updated: holding.last_updated
    };
  }) || [];

  return {
    holdings: enrichedHoldings,
    count: enrichedHoldings.length,
    currency: userCurrency
  };
}

// Gemini API Client
export class GeminiClient {
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  private model = 'models/gemini-2.5-flash'; // Free tier model (most stable)

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set');
    }
    this.apiKey = apiKey;
  }

  async chat(userMessage: string, userId: string, conversationHistory: Array<{ role: string; parts: Array<{ text?: string; [key: string]: unknown }> }> = [], selectedMonth?: string): Promise<{ text: string; functionCalled?: string | null; functionResult?: Record<string, unknown> }> {
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
      const userCurrency = await getUserCurrency(userId);
      
      // Use selected month from UI or default to current month
      const currentMonth = selectedMonth || today.toISOString().slice(0, 7);

      // Build conversation history
      const contents = [
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ];

      const response = await fetch(
        `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents,
            tools: [{
              function_declarations: functions
            }],
            systemInstruction: {
              parts: [{
                text: `You are a helpful financial assistant for a personal finance app.
Current Date: ${dateString} (${weekday}).
User's Default Currency: ${userCurrency}.
User is Currently Viewing: ${currentMonth} (This is the month selected in their budget view)

You can help users track expenses, manage budgets, analyze spending patterns, monitor investments, and provide comprehensive financial insights.
When users ask about their finances, use the available functions to retrieve and analyze their data.
Be conversational, friendly, and provide actionable advice.
Always format currency amounts clearly and provide context for numbers.
When presenting budget information, use the user's default currency (${userCurrency}).

SPENDING ANALYSIS GUIDELINES:
When users ask for spending summaries or analysis:
1. ALWAYS call get_spending_summary with group_by: "category" and include_comparison: true
2. Provide a comprehensive analysis including:
   - Total spending amount
   - Top spending categories with amounts and percentages
   - Comparison with previous period (increase/decrease)
   - Insights about spending patterns
   - Actionable recommendations
3. Format the response with clear structure using bullet points or numbered lists
4. Highlight any unusual spending patterns or categories that exceed expectations
5. Be specific with numbers and percentages, not just general statements

Example response format:
"Here's your spending analysis for [period]:

💰 **Total Spending**: [amount] [currency]

📊 **Top Categories**:
• [Category 1]: [amount] ([percentage]%)
• [Category 2]: [amount] ([percentage]%)
• [Category 3]: [amount] ([percentage]%)

📈 **Trends**:
• [Comparison with previous period]
• [Any notable changes]

💡 **Insights**: [Provide actionable advice based on the data]"

INVESTMENT CAPABILITIES:
- You can access the user's investment portfolio using get_portfolio function
- You can retrieve individual holdings (stocks, crypto, ETFs, etc.) using get_holdings function
- Portfolio data includes total value, gain/loss, performance, and allocation by asset class
- When users ask about "investments", "portfolio", "stocks", "holdings", use these functions

CRITICAL - MONTH HANDLING (READ CAREFULLY):
- The user is currently viewing ${currentMonth} in their budget page UI.
- When calling get_budget function, you MUST ALWAYS provide the month parameter.
- The month parameter is REQUIRED - never call get_budget without it.

DEFAULT MONTH TO USE:
- When user asks "How am I doing with my budgets?" → use month: "${currentMonth}"
- When user says "my budgets" or "check budgets" → use month: "${currentMonth}"
- When user says "this month" → use month: "${currentMonth}"
- The user is viewing ${currentMonth}, so that's what they're asking about unless they explicitly mention a different month.

OVERRIDE MONTH (when user specifies):
- "last month" → calculate previous month
- "September 2024" → use "2024-09"
- "next month" → calculate next month

EXPENSE DATE HANDLING:
- If the user says "today" for expenses, use ${dateString}
- If the user says "yesterday", calculate the date based on ${dateString}
- If no date specified for expense, use ${dateString}

OTHER RULES:
- If multiple expenses in one message, call create_expense multiple times
- Always report financial totals in ${userCurrency}
- Always mention which month you're reporting (e.g., "For ${currentMonth}...")

EXAMPLE FUNCTION CALLS:
User: "How am I doing with my budgets?"
→ Call: get_budget({ month: "${currentMonth}", include_spent: true })

User: "Check my food budget"
→ Call: get_budget({ category: "Food & Dining", month: "${currentMonth}", include_spent: true })`
              }]
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const candidate = data.candidates[0];

      // Check if Gemini wants to call functions (can be multiple)
      const functionCallParts = candidate.content.parts.filter((part: { functionCall?: unknown }) => part.functionCall);

      if (functionCallParts.length > 0) {
        console.log(`Gemini wants to call ${functionCallParts.length} functions`);

        // Execute all functions in parallel
        const executionResults = await Promise.all(
          functionCallParts.map(async (part: { functionCall: { name: string; args: Record<string, unknown> } }) => {
            const functionCall = part.functionCall;
            const functionName = functionCall.name;
            const functionArgs = functionCall.args;

            console.log(`Calling function: ${functionName}`, functionArgs);
            const result = await executeFunction(functionName, functionArgs, userId, userCurrency);
            
            return {
              functionCall: functionCall,
              name: functionName,
              response: {
                name: functionName,
                response: result
              }
            };
          })
        );

        // Send function results back to Gemini
        // We need to include the model's function calls in the history
        const followUpContents = [
          ...contents,
          {
            role: 'model',
            parts: functionCallParts
          },
          {
            role: 'user',
            parts: executionResults.map(r => ({ functionResponse: r.response }))
          }
        ];

        const followUpResponse = await fetch(
          `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: followUpContents,
              tools: [{
                function_declarations: functions
              }]
            })
          }
        );

        const followUpData = await followUpResponse.json();
        const finalResponse = followUpData.candidates[0].content.parts[0].text;
        
        // Aggregate results for the UI
        const functionNames = executionResults.map(r => r.name).join(', ');
        const totalSuccess = executionResults.length;
        
        return {
          text: finalResponse,
          functionCalled: functionNames,
          functionResult: {
            success: true,
            message: `Executed ${totalSuccess} action${totalSuccess > 1 ? 's' : ''}`,
            count: totalSuccess
          }
        };
      }

      // No function call, return text response
      return {
        text: candidate.content.parts[0].text,
        functionCalled: null
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const gemini = new GeminiClient();

