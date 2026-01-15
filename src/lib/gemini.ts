import { supabase } from './supabase';
import { convertCurrency } from './currencyConversion';
import { GoogleGenAI, Type } from '@google/genai';
import type { Content, Part, FunctionDeclaration } from '@google/genai';

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
const functions: FunctionDeclaration[] = [
  {
    name: 'get_expenses',
    description: 'Retrieve user expenses with optional filters for category, date range, amount, and day of week. Can return data in a specific currency.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Filter by expense category (e.g., "Food & Dining", "Transportation", "Shopping")',
          enum: ['Food & Dining', 'Transportation', 'Groceries', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Housing', 'Personal Care', 'Miscellaneous']
        },
        start_date: {
          type: Type.STRING,
          description: 'Start date for filtering expenses (YYYY-MM-DD format)'
        },
        end_date: {
          type: Type.STRING,
          description: 'End date for filtering expenses (YYYY-MM-DD format)'
        },
        min_amount: {
          type: Type.NUMBER,
          description: 'Minimum expense amount'
        },
        max_amount: {
          type: Type.NUMBER,
          description: 'Maximum expense amount'
        },
        day_of_week_filter: {
          type: Type.STRING,
          description: 'Filter by day of week. Use "weekend" for Saturdays and Sundays, "weekday" for Monday through Friday, or specific days like "saturday", "sunday", "monday", etc.',
          enum: ['weekend', 'weekday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of expenses to return (default: 50)'
        },
        sort_by: {
          type: Type.STRING,
          description: 'Sort expenses by field',
          enum: ['date', 'amount', 'category']
        },
        sort_order: {
          type: Type.STRING,
          description: 'Sort order',
          enum: ['asc', 'desc']
        },
        display_currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Specific budget category to retrieve'
        },
        include_spent: {
          type: Type.BOOLEAN,
          description: 'Include amount spent against budget (default: true)'
        },
        month: {
          type: Type.STRING,
          description: 'REQUIRED: Month to calculate spent amount for (YYYY-MM format). ALWAYS provide this parameter. Examples: "2024-11", "2025-11", "2024-10".'
        },
        display_currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: 'Expense amount'
        },
        description: {
          type: Type.STRING,
          description: 'Description of the expense'
        },
        category: {
          type: Type.STRING,
          description: 'Expense category',
          enum: ['Food & Dining', 'Transportation', 'Groceries', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Housing', 'Personal Care', 'Miscellaneous']
        },
        date: {
          type: Type.STRING,
          description: 'Date of expense (YYYY-MM-DD format, defaults to today)'
        },
        currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Budget category'
        },
        amount: {
          type: Type.NUMBER,
          description: 'Budget amount'
        },
        currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: 'Time period for summary',
          enum: ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'all_time']
        },
        group_by: {
          type: Type.STRING,
          description: 'Group summary by field',
          enum: ['category', 'date', 'month']
        },
        include_comparison: {
          type: Type.BOOLEAN,
          description: 'Include comparison with previous period (default: false)'
        },
        display_currency: {
          type: Type.STRING,
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'search_transactions',
    description: 'Search for specific expenses by keyword/merchant name in description or other text fields. Can return data in a specific currency.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Search query text'
        },
        type: {
          type: Type.STRING,
          description: 'Transaction type to search',
          enum: ['expense', 'income', 'both']
        },
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of results (default: 20)'
        },
        display_currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        source: {
          type: Type.STRING,
          description: 'Filter by income source (e.g., "Salary", "Freelance", "Investment")'
        },
        start_date: {
          type: Type.STRING,
          description: 'Start date for filtering (YYYY-MM-DD format)'
        },
        end_date: {
          type: Type.STRING,
          description: 'End date for filtering (YYYY-MM-DD format)'
        },
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of records to return (default: 50)'
        },
        display_currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        is_active: {
          type: Type.BOOLEAN,
          description: 'Filter by active status (default: true)'
        },
        upcoming_days: {
          type: Type.NUMBER,
          description: 'Show subscriptions due in next N days'
        },
        display_currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        display_currency: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        symbol: {
          type: Type.STRING,
          description: 'Filter by specific symbol (e.g., AAPL, BTC-USD)'
        },
        asset_class: {
          type: Type.STRING,
          description: 'Filter by asset class',
          enum: ['stock', 'crypto', 'bond', 'etf', 'mutual_fund', 'real_estate', 'commodities']
        },
        display_currency: {
          type: Type.STRING,
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'get_assets',
    description: 'Get comprehensive net worth including ALL financial data: wallets (with balances), investment portfolio holdings, and assets (bank accounts, savings, e-wallets, cash, property). Use this when users ask about their total savings, net worth, "how much do I have", or want a complete financial overview. Returns breakdown by category: wallets, portfolio, and assets.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'Filter assets table by type (optional, only affects assets category)',
          enum: ['Cash', 'Bank Account', 'Investment', 'E-Wallet', 'Cryptocurrency', 'Real Estate', 'Vehicle', 'Other', 'all']
        },
        display_currency: {
          type: Type.STRING,
          description: 'Currency to display amounts in',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      }
    }
  },
  {
    name: 'semantic_search_expenses',
    description: 'Search for expenses using semantic/conceptual meaning rather than exact keywords. Perfect for finding related expenses by concept (e.g., "coffee" finds Starbucks, "travel" finds flights/hotels/taxis, "health" finds gym/pharmacy/doctor). Use this when users ask about spending on concepts, themes, or types of activities rather than specific merchant names.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search_concept: {
          type: Type.STRING,
          description: 'The concept, theme, or type of spending to search for (e.g., "coffee", "travel to Japan", "medical expenses", "entertainment", "weekend dining")'
        },
        category: {
          type: Type.STRING,
          description: 'Optional: Filter results by category',
          enum: ['Food & Dining', 'Transportation', 'Groceries', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Housing', 'Personal Care', 'Miscellaneous']
        },
        start_date: {
          type: Type.STRING,
          description: 'Optional: Start date filter (YYYY-MM-DD format)'
        },
        end_date: {
          type: Type.STRING,
          description: 'Optional: End date filter (YYYY-MM-DD format)'
        },
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of results to return (default: 10, max: 50)'
        },
        min_similarity: {
          type: Type.NUMBER,
          description: 'Minimum similarity threshold 0-1 (default: 0.65, higher = more strict)'
        },
        display_currency: {
          type: Type.STRING,
          description: 'Currency to display amounts in (e.g., USD, MYR, SGD). If provided, overrides default currency.',
          enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR']
        }
      },
      required: ['search_concept']
    }
  },
  {
    name: 'generate_chart',
    description: 'Generate a chart visualization for financial data. Use this when users ask to "compare", "show trend", "visualize", or request a chart/graph of their spending, income, or budget data. The chart will be rendered visually in the chat. For comparing concepts that are not categories (e.g., "food delivery vs dine-in", "coffee vs bubble tea"), use semantic_comparison with search_concepts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chart_type: {
          type: Type.STRING,
          description: 'Type of chart to generate. Use "bar" for comparisons between categories, "line" for trends over time, "pie" for distribution/breakdown',
          enum: ['bar', 'line', 'pie']
        },
        title: {
          type: Type.STRING,
          description: 'Chart title to display (e.g., "Food vs Transport Spending", "Monthly Spending Trend", "Food Delivery vs Dine-In")'
        },
        data_query: {
          type: Type.STRING,
          description: 'Type of data analysis to perform. Use "semantic_comparison" when comparing concepts that are not categories (e.g., food delivery vs dine-in, coffee vs bubble tea).',
          enum: ['category_comparison', 'monthly_trend', 'category_breakdown', 'income_vs_expenses', 'semantic_comparison']
        },
        categories: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Categories to include (for category_comparison). Use exact category names: "Food & Dining", "Transportation", "Groceries", "Entertainment", "Shopping", "Utilities", "Healthcare", "Housing", "Personal Care", "Miscellaneous"'
        },
        category: {
          type: Type.STRING,
          description: 'Single category to filter for (for monthly_trend of a specific category). Use exact category names: "Food & Dining", "Transportation", "Groceries", "Entertainment", "Shopping", "Utilities", "Healthcare", "Housing", "Personal Care", "Miscellaneous"'
        },
        search_concepts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Two or more search concepts to compare (for semantic_comparison). Each concept will be searched using semantic search. Examples: ["food delivery grabfood foodpanda ubereats deliveroo", "restaurant dine-in dining out"], ["coffee starbucks", "bubble tea boba"]'
        },
        concept_labels: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Human-readable labels for each search concept (for semantic_comparison chart legend). Must match the length of search_concepts. Examples: ["Food Delivery", "Dine-In"], ["Coffee", "Bubble Tea"]'
        },
        months: {
          type: Type.NUMBER,
          description: 'Number of months to include (for monthly_trend, income_vs_expenses, or semantic_comparison). Default is 6.'
        },
        start_date: {
          type: Type.STRING,
          description: 'Start date for data (YYYY-MM-DD format)'
        },
        end_date: {
          type: Type.STRING,
          description: 'End date for data (YYYY-MM-DD format)'
        }
      },
      required: ['chart_type', 'title', 'data_query']
    }
  },
  {
    name: 'delete_expenses',
    description: 'Delete expenses matching specified criteria. IMPORTANT: Always preview first (confirm=false), then ask user for confirmation before deleting (confirm=true). This action is permanent.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        start_date: {
          type: Type.STRING,
          description: 'Delete expenses from this date onwards (YYYY-MM-DD format)'
        },
        end_date: {
          type: Type.STRING,
          description: 'Delete expenses up to this date (YYYY-MM-DD format)'
        },
        category: {
          type: Type.STRING,
          description: 'Only delete expenses in this specific category',
          enum: ['Food & Dining', 'Transportation', 'Groceries', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Housing', 'Personal Care', 'Miscellaneous']
        },
        description_contains: {
          type: Type.STRING,
          description: 'Only delete expenses with description containing this text (case-insensitive)'
        },
        confirm: {
          type: Type.BOOLEAN,
          description: 'REQUIRED. Set to false to preview what will be deleted. Set to true only after user confirms deletion.'
        }
      },
      required: ['confirm']
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

// Helper: Generate text embedding using Gemini API
// This is a standalone function that can be used before GeminiClient class is defined
async function getTextEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenAI({ apiKey });
  const embeddingModel = 'gemini-embedding-001';

  try {
    const response = await genAI.models.embedContent({
      model: embeddingModel,
      contents: text,
      config: {
        outputDimensionality: 768
      }
    });

    if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
      throw new Error('Invalid embedding response from Gemini API');
    }

    return response.embeddings[0].values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
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

      case 'get_assets':
        return await getAssets(userId, args, targetCurrency);

      case 'semantic_search_expenses':
        return await semanticSearchExpenses(userId, args, targetCurrency);

      case 'generate_chart':
        return await generateChart(userId, args, targetCurrency);

      case 'delete_expenses':
        return await deleteExpenses(userId, args, targetCurrency);

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

  // Don't apply limit here if we need to filter by day of week
  // We'll apply it after filtering
  if (!params.day_of_week_filter) {
    if (params.limit) {
      query = query.limit(params.limit as number);
    } else {
      query = query.limit(50);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  // Filter by day of week if specified
  let filteredData = data || [];
  if (params.day_of_week_filter) {
    const dayFilter = (params.day_of_week_filter as string).toLowerCase();

    filteredData = filteredData.filter(expense => {
      const expenseDate = new Date(expense.date);
      const dayOfWeek = expenseDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      switch (dayFilter) {
        case 'weekend':
          return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
        case 'weekday':
          return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday through Friday
        case 'sunday':
          return dayOfWeek === 0;
        case 'monday':
          return dayOfWeek === 1;
        case 'tuesday':
          return dayOfWeek === 2;
        case 'wednesday':
          return dayOfWeek === 3;
        case 'thursday':
          return dayOfWeek === 4;
        case 'friday':
          return dayOfWeek === 5;
        case 'saturday':
          return dayOfWeek === 6;
        default:
          return true; // No filter if unrecognized
      }
    });

    // Apply limit after filtering
    const limit = (params.limit as number) || 50;
    filteredData = filteredData.slice(0, limit);
  }

  // Calculate total in user's currency
  const total = filteredData.reduce((sum, e) => {
    return sum + convertCurrency(e.amount, e.currency || 'USD', userCurrency);
  }, 0);

  // Enrich expenses with converted amounts for multi-currency display
  const enrichedExpenses = filteredData.map(e => {
    const originalCurrency = e.currency || 'USD';
    const convertedAmount = convertCurrency(e.amount, originalCurrency, userCurrency);
    return {
      ...e,
      original_currency: originalCurrency,
      original_amount: e.amount,
      converted_amount: Math.round(convertedAmount * 100) / 100,
      display_currency: userCurrency
    };
  });

  return {
    expenses: enrichedExpenses,
    count: enrichedExpenses.length,
    total: Math.round(total * 100) / 100,
    currency: userCurrency,
    user_currency: userCurrency,
    note: 'Each expense shows original_amount in original_currency and converted_amount in display_currency (user currency)',
    ...(params.day_of_week_filter ? {
      filtered_by: params.day_of_week_filter,
      filter_note: `Expenses filtered to show only ${params.day_of_week_filter} transactions`
    } : {})
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
  try {
    // 1. Generate embedding for semantic search
    const geminiClient = new GeminiClient();

    // Create embedding text from description only
    const embeddingText = (params.description as string) || '';
    console.log(`[create_expense] Generating embedding for: "${embeddingText}"`);

    let embedding: number[] | null = null;
    try {
      embedding = await geminiClient.getEmbedding(embeddingText);
    } catch (embeddingError) {
      // Log error but don't fail the entire expense creation
      console.error('[create_expense] Failed to generate embedding:', embeddingError);
      // Continue without embedding - can be generated later via migration script
    }

    // 2. Insert expense with embedding
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        amount: params.amount,
        description: params.description,
        category: params.category,
        date: params.date || new Date().toISOString().split('T')[0],
        currency: params.currency || userCurrency,
        embedding: embedding // Will be null if embedding generation failed
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      expense: data,
      message: `Added expense: ${params.description} - ${params.amount} ${data.currency}`,
      embedding_generated: embedding !== null
    };
  } catch (error) {
    console.error('[create_expense] Error:', error);
    throw error;
  }
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

// Function: Delete Expenses
async function deleteExpenses(userId: string, params: Record<string, unknown>, userCurrency: string) {
  // Build query to find matching expenses
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId);

  if (params.start_date) {
    query = query.gte('date', params.start_date as string);
  }

  if (params.end_date) {
    query = query.lte('date', params.end_date as string);
  }

  if (params.category) {
    query = query.eq('category', params.category as string);
  }

  const { data: expenses, error: fetchError } = await query;

  if (fetchError) throw fetchError;

  // Filter by description if specified (case-insensitive)
  let filteredExpenses = expenses || [];
  if (params.description_contains) {
    const searchTerm = (params.description_contains as string).toLowerCase();
    filteredExpenses = filteredExpenses.filter(exp =>
      exp.description?.toLowerCase().includes(searchTerm)
    );
  }

  // Calculate total in user currency
  const total = filteredExpenses.reduce((sum, e) => {
    return sum + convertCurrency(e.amount, e.currency || 'USD', userCurrency);
  }, 0);

  // If confirm is false, just return preview
  if (!params.confirm) {
    return {
      preview: true,
      count: filteredExpenses.length,
      total: Math.round(total * 100) / 100,
      currency: userCurrency,
      expenses: filteredExpenses.slice(0, 10).map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        category: e.category
      })),
      message: filteredExpenses.length > 0
        ? `Found ${filteredExpenses.length} expense(s) totaling ${Math.round(total * 100) / 100} ${userCurrency}. Ask the user to confirm deletion.`
        : 'No expenses found matching the criteria.',
      ...(filteredExpenses.length > 10 && {
        note: `Showing first 10 of ${filteredExpenses.length} expenses`
      })
    };
  }

  // Confirm = true, proceed with deletion
  if (filteredExpenses.length === 0) {
    return {
      success: false,
      message: 'No expenses found matching the criteria. Nothing was deleted.'
    };
  }

  // Delete all matching expenses
  const expenseIds = filteredExpenses.map(e => e.id);

  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .in('id', expenseIds);

  if (deleteError) throw deleteError;

  return {
    success: true,
    deleted_count: filteredExpenses.length,
    total_deleted: Math.round(total * 100) / 100,
    currency: userCurrency,
    message: `Successfully deleted ${filteredExpenses.length} expense(s) totaling ${Math.round(total * 100) / 100} ${userCurrency}.`
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
      .select('amount, currency, category')
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
      change_percent: Math.round(changePercent * 10) / 10,
      previous_period_start: prev_start,
      previous_period_end: prev_end
    };

    // If grouped by category, also include per-category comparison
    if (params.group_by === 'category' && prevExpenses) {
      const prevByCategory = prevExpenses.reduce((acc: Record<string, { total: number; count: number }>, e) => {
        if (!acc[e.category]) {
          acc[e.category] = { total: 0, count: 0 };
        }
        acc[e.category].total += convertCurrency(e.amount, e.currency || 'USD', userCurrency);
        acc[e.category].count += 1;
        return acc;
      }, {});

      // Round totals
      Object.keys(prevByCategory).forEach(cat => {
        prevByCategory[cat].total = Math.round(prevByCategory[cat].total * 100) / 100;
      });

      // Add category comparison to each category in by_category
      const byCategory = summary.by_category as Record<string, { total: number; count: number; currency: string }> | undefined;
      if (byCategory) {
        // Get all categories from both periods
        const allCategories = new Set([...Object.keys(byCategory), ...Object.keys(prevByCategory)]);

        const categoryComparison: Record<string, {
          current: number;
          previous: number;
          change: number;
          change_percent: number
        }> = {};

        allCategories.forEach(cat => {
          const current = byCategory[cat]?.total || 0;
          const previous = prevByCategory[cat]?.total || 0;
          const catChange = current - previous;
          const catChangePercent = previous > 0 ? ((catChange / previous) * 100) : (current > 0 ? 100 : 0);

          categoryComparison[cat] = {
            current: Math.round(current * 100) / 100,
            previous: Math.round(previous * 100) / 100,
            change: Math.round(catChange * 100) / 100,
            change_percent: Math.round(catChangePercent * 10) / 10
          };
        });

        summary.category_comparison = categoryComparison;
      }
    }
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

  // Enrich income with converted amounts for multi-currency display
  const enrichedIncome = data?.map(i => {
    const originalCurrency = i.currency || 'USD';
    const convertedAmount = convertCurrency(i.amount, originalCurrency, userCurrency);
    return {
      ...i,
      original_currency: originalCurrency,
      original_amount: i.amount,
      converted_amount: Math.round(convertedAmount * 100) / 100,
      display_currency: userCurrency
    };
  }) || [];

  return {
    income: enrichedIncome,
    count: enrichedIncome.length,
    total: Math.round(total * 100) / 100,
    currency: userCurrency,
    user_currency: userCurrency,
    note: 'Each income shows original_amount in original_currency and converted_amount in display_currency'
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
// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPeriodDates(period: string): { start_date: string; end_date: string } {
  const now = new Date();
  let start_date: Date;
  let end_date: Date = new Date(now); // Create a copy to avoid mutation issues

  switch (period) {
    case 'today':
      start_date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'this_week':
      start_date = new Date(now);
      start_date.setDate(now.getDate() - now.getDay());
      // End of week (Saturday)
      end_date = new Date(now);
      end_date.setDate(now.getDate() + (6 - now.getDay()));
      break;
    case 'this_month':
      start_date = new Date(now.getFullYear(), now.getMonth(), 1);
      // Last day of current month
      end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_month':
      start_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end_date = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_year':
      start_date = new Date(now.getFullYear(), 0, 1);
      // Last day of current year
      end_date = new Date(now.getFullYear(), 11, 31);
      break;
    case 'all_time':
      start_date = new Date('2020-01-01');
      break;
    default:
      start_date = new Date(now.getFullYear(), now.getMonth(), 1);
      end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return {
    start_date: formatLocalDate(start_date),
    end_date: formatLocalDate(end_date)
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
    start_date: formatLocalDate(start_date),
    end_date: formatLocalDate(end_date)
  };
}

// Helper: Check if price is stale (older than 15 minutes)
function isPriceStale(lastUpdated?: string): boolean {
  if (!lastUpdated) return true;
  const STALE_MINUTES = 15;
  return Date.now() - new Date(lastUpdated).getTime() > STALE_MINUTES * 60 * 1000;
}

// Helper: Fetch real-time stock price from Yahoo Finance
async function fetchRealTimePrice(symbol: string): Promise<number | null> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) return price;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
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

  // Refresh stale prices in parallel
  const priceUpdates: Promise<void>[] = [];
  for (const holding of holdings) {
    if (isPriceStale(holding.last_updated)) {
      const updatePromise = (async () => {
        const newPrice = await fetchRealTimePrice(holding.symbol);
        if (newPrice !== null) {
          holding.current_price = newPrice;
          // Update database in background (don't await)
          void (async () => {
            try {
              await supabase
                .from('holdings')
                .update({ current_price: newPrice, last_updated: new Date().toISOString() })
                .eq('id', holding.id);
            } catch (err: unknown) {
              console.error('Failed to update price in DB:', err);
            }
          })();
        }
      })();
      priceUpdates.push(updatePromise);
    }
  }

  // Wait for all price fetches to complete
  await Promise.all(priceUpdates);

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

  if (!holdings || holdings.length === 0) {
    return {
      holdings: [],
      count: 0,
      currency: userCurrency
    };
  }

  // Refresh stale prices in parallel
  const priceUpdates: Promise<void>[] = [];
  for (const holding of holdings) {
    if (isPriceStale(holding.last_updated)) {
      const updatePromise = (async () => {
        const newPrice = await fetchRealTimePrice(holding.symbol);
        if (newPrice !== null) {
          holding.current_price = newPrice;
          // Update database in background (don't await)
          void (async () => {
            try {
              await supabase
                .from('holdings')
                .update({ current_price: newPrice, last_updated: new Date().toISOString() })
                .eq('id', holding.id);
            } catch (err: unknown) {
              console.error('Failed to update price in DB:', err);
            }
          })();
        }
      })();
      priceUpdates.push(updatePromise);
    }
  }

  // Wait for all price fetches to complete
  await Promise.all(priceUpdates);

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

// Function: Get Assets - Comprehensive Net Worth (wallets, portfolio, and assets)
async function getAssets(userId: string, params: Record<string, unknown>, userCurrency: string) {
  // Import wallet utilities
  const { getWallets, calculateWalletBalance } = await import('./wallets');

  // 1. Get all wallets with balances
  // NOTE: Using raw balance (no currency conversion) to match UI behavior in Assets page
  const wallets = await getWallets(userId);
  const walletData = await Promise.all(
    wallets.map(async (wallet) => {
      const { balance } = await calculateWalletBalance(wallet.id, userCurrency);
      // Use raw balance to match UI (Assets page doesn't convert wallet currencies in total)
      return {
        id: wallet.id,
        name: wallet.name,
        type: 'Wallet',
        category: 'wallets',
        amount: Math.round(balance * 100) / 100,
        currency: wallet.currency || userCurrency,
        is_default: wallet.is_default
      };
    })
  );
  // Sum raw balances (matches UI behavior - no currency conversion for wallets)
  const walletsTotal = walletData.reduce((sum, w) => sum + w.amount, 0);

  // 2. Get investment portfolio (holdings)
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (holdingsError) console.error('Error fetching holdings:', holdingsError);

  // Refresh stale prices and calculate portfolio value
  const portfolioData = (holdings || []).map(holding => {
    const currentPrice = holding.current_price || holding.average_price;
    const value = holding.shares * currentPrice;
    const convertedValue = convertCurrency(value, holding.currency || 'USD', userCurrency);
    return {
      id: holding.id,
      name: `${holding.symbol} (${holding.shares} shares)`,
      type: holding.asset_class || 'stock',
      category: 'portfolio',
      original_amount: value,
      original_currency: holding.currency || 'USD',
      converted_amount: Math.round(convertedValue * 100) / 100,
      display_currency: userCurrency,
      symbol: holding.symbol,
      shares: holding.shares,
      current_price: currentPrice
    };
  });
  const portfolioTotal = portfolioData.reduce((sum, h) => sum + h.converted_amount, 0);

  // 3. Get assets from assets table
  let assetsQuery = supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .order('amount', { ascending: false });

  if (params.type && params.type !== 'all') {
    assetsQuery = assetsQuery.eq('type', params.type as string);
  }

  const { data: assetsData, error: assetsError } = await assetsQuery;

  if (assetsError) console.error('Error fetching assets:', assetsError);

  const assetsTableData = (assetsData || []).map(asset => {
    const originalCurrency = asset.currency || 'USD';
    const convertedAmount = convertCurrency(asset.amount, originalCurrency, userCurrency);
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      category: 'assets',
      description: asset.description,
      original_amount: asset.amount,
      original_currency: originalCurrency,
      converted_amount: Math.round(convertedAmount * 100) / 100,
      display_currency: userCurrency
    };
  });
  const assetsTableTotal = assetsTableData.reduce((sum, a) => sum + a.converted_amount, 0);

  // Calculate total net worth
  const totalNetWorth = walletsTotal + portfolioTotal + assetsTableTotal;

  // Build breakdown by category
  const breakdown = {
    wallets: {
      items: walletData,
      count: walletData.length,
      total: Math.round(walletsTotal * 100) / 100
    },
    portfolio: {
      items: portfolioData,
      count: portfolioData.length,
      total: Math.round(portfolioTotal * 100) / 100
    },
    assets: {
      items: assetsTableData,
      count: assetsTableData.length,
      total: Math.round(assetsTableTotal * 100) / 100
    }
  };

  return {
    total_net_worth: Math.round(totalNetWorth * 100) / 100,
    currency: userCurrency,
    breakdown,
    summary: {
      wallets_total: Math.round(walletsTotal * 100) / 100,
      portfolio_total: Math.round(portfolioTotal * 100) / 100,
      assets_total: Math.round(assetsTableTotal * 100) / 100
    },
    note: 'Total net worth includes: Wallets (cash flow tracking), Investment Portfolio (stocks, crypto, etc.), and Assets (bank accounts, savings, e-wallets, property, etc.)'
  };
}

// Function: Semantic Search Expenses (Gemini AI Filtering)
// Uses few-shot prompting to filter expenses by search concept
// NOTE: RAG embedding-based search is currently disabled - using Gemini for better accuracy
async function semanticSearchExpenses(userId: string, params: Record<string, unknown>, userCurrency: string) {
  try {
    const searchConcept = params.search_concept as string;
    const matchThreshold = (params.min_similarity as number) || 0.65;
    const matchCount = Math.min((params.limit as number) || 50, 100);

    console.log(`[semantic_search] Searching for: "${searchConcept}"`);

    // Step 1: Fetch all expenses in the date range for AI filtering
    let expenseQuery = supabase
      .from('expenses')
      .select('id, description, amount, category, date, currency')
      .eq('user_id', userId);

    if (params.start_date) {
      expenseQuery = expenseQuery.gte('date', params.start_date as string);
    }
    if (params.end_date) {
      expenseQuery = expenseQuery.lte('date', params.end_date as string);
    }
    if (params.category) {
      expenseQuery = expenseQuery.eq('category', params.category as string);
    }

    const { data: allExpenses, error: fetchError } = await expenseQuery;

    if (fetchError) {
      console.error('[semantic_search] Error fetching expenses:', fetchError);
      throw fetchError;
    }

    if (!allExpenses || allExpenses.length === 0) {
      return {
        results: [],
        count: 0,
        message: `No expenses found in the specified date range.`,
        search_concept: searchConcept,
        threshold_used: matchThreshold
      };
    }

    console.log(`[semantic_search] Fetched ${allExpenses.length} expenses to filter`);

    // Step 2: Use Gemini to filter expenses by the search concept
    // Prepare expense list for AI (limit to 100 to avoid token limits)
    const expensesToFilter = allExpenses.slice(0, 100).map((e, idx) => ({
      idx,
      desc: e.description,
      amount: e.amount,
      date: e.date,
      category: e.category
    }));

    const filterPrompt = `You are a financial expense classifier. Given a search concept and a list of expenses, identify ONLY the expenses that are directly related to the search concept.

SEARCH CONCEPT: "${searchConcept}"

EXPENSES TO FILTER:
${expensesToFilter.map(e => `[${e.idx}] ${e.desc} - ${e.category} - ${e.date}`).join('\n')}

IMPORTANT RULES:
1. Be STRICT - only include expenses that are DIRECTLY related to the search concept
2. For "coffee" - include: coffee shops, Starbucks, Coffee Bean, cafes serving coffee, kopi
3. Do NOT include unrelated items like "Christmas Dinner", "Shopping", "Rent" etc.
4. Return ONLY the index numbers of matching expenses as a JSON array

Example response for coffee search: [0, 3, 7]
If no expenses match: []

Return ONLY the JSON array, no other text:`;

    // Call Gemini for filtering
    const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
    const filterResponse = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: filterPrompt
    });

    // Parse the response to get matching indices
    let matchingIndices: number[] = [];
    try {
      const responseText = filterResponse.text?.trim() || '[]';
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\[[\d,\s]*\]/);
      if (jsonMatch) {
        matchingIndices = JSON.parse(jsonMatch[0]);
      }
      console.log(`[semantic_search] Gemini identified ${matchingIndices.length} matching expenses`);
    } catch (parseError) {
      console.error('[semantic_search] Error parsing Gemini response:', parseError);
      // Fallback: return empty results
      matchingIndices = [];
    }

    // Step 3: Get the matching expenses
    const matchedExpenses = matchingIndices
      .filter(idx => idx >= 0 && idx < allExpenses.length)
      .map(idx => allExpenses[idx]);

    if (matchedExpenses.length === 0) {
      return {
        results: [],
        count: 0,
        message: `No expenses found related to "${searchConcept}".`,
        search_concept: searchConcept,
        threshold_used: matchThreshold
      };
    }

    // Step 4: Format results with currency conversion
    const formattedResults = matchedExpenses.slice(0, matchCount).map(e => {
      const originalCurrency = e.currency || 'USD';
      const convertedAmount = convertCurrency(e.amount, originalCurrency, userCurrency);
      return {
        id: e.id,
        description: e.description,
        original_amount: e.amount,
        original_currency: originalCurrency,
        converted_amount: Math.round(convertedAmount * 100) / 100,
        display_currency: userCurrency,
        category: e.category,
        date: e.date
      };
    });

    // Step 5: Calculate total in user currency
    const total = formattedResults.reduce((sum, e) => sum + e.converted_amount, 0);

    // Step 6: Group by category for insights
    const byCategory = formattedResults.reduce((acc: Record<string, { total: number; count: number }>, e) => {
      if (!acc[e.category]) {
        acc[e.category] = { total: 0, count: 0 };
      }
      acc[e.category].total += e.converted_amount;
      acc[e.category].count += 1;
      return acc;
    }, {});

    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].total = Math.round(byCategory[cat].total * 100) / 100;
    });

    console.log(`[semantic_search] Final results: ${formattedResults.length} expenses`);

    return {
      results: formattedResults,
      count: formattedResults.length,
      total_amount: Math.round(total * 100) / 100,
      currency: userCurrency,
      by_category: byCategory,
      search_concept: searchConcept,
      threshold_used: matchThreshold,
      message: `Found ${formattedResults.length} expense${formattedResults.length !== 1 ? 's' : ''} related to "${searchConcept}"`,
      filters_applied: {
        category: params.category || null,
        date_range: params.start_date && params.end_date
          ? `${params.start_date} to ${params.end_date}`
          : null
      }
    };

  } catch (error) {
    console.error('[semantic_search] Error:', error);
    throw error;
  }
}

// Function: Generate Chart Data for AI Chat
async function generateChart(userId: string, params: Record<string, unknown>, userCurrency: string) {
  const chartType = params.chart_type as 'bar' | 'line' | 'pie';
  const title = params.title as string;
  const dataQuery = params.data_query as string;
  const categories = params.categories as string[] | undefined;
  const category = params.category as string | undefined; // Single category filter
  const months = (params.months as number) || 6;

  // Calculate date range - go back exactly 'months' months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  // Keep the same day of month for consistency with AI listings

  const startDateStr = params.start_date as string || startDate.toISOString().split('T')[0];
  const endDateStr = params.end_date as string || endDate.toISOString().split('T')[0];

  try {
    switch (dataQuery) {
      case 'category_comparison': {
        // Compare spending between categories BY MONTH (more meaningful chart)
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select('amount, category, currency, date')
          .eq('user_id', userId)
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        if (error) throw error;

        // Filter to specified categories if provided
        const filteredExpenses = categories
          ? expenses?.filter(e => categories.includes(e.category)) || []
          : expenses || [];

        // Group by month and category
        // Pre-populate all months in the range
        const monthlyData: Record<string, { categories: Record<string, number>; sortDate: Date }> = {};
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthlyData[monthKey] = { categories: {}, sortDate: new Date(currentDate) };
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const categorySet = new Set<string>();

        filteredExpenses.forEach(e => {
          const date = new Date(e.date);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          const amount = convertCurrency(e.amount, e.currency || 'USD', userCurrency);

          if (monthlyData[monthKey]) {
            monthlyData[monthKey].categories[e.category] = (monthlyData[monthKey].categories[e.category] || 0) + amount;
          }
          categorySet.add(e.category);
        });

        // Sort months chronologically and format data
        const chartData = Object.entries(monthlyData)
          .map(([month, data]) => {
            const dataPoint: Record<string, unknown> = { name: month };
            categorySet.forEach(cat => {
              dataPoint[cat] = Math.round((data.categories[cat] || 0) * 100) / 100;
            });
            dataPoint.sortDate = data.sortDate;
            return dataPoint;
          })
          .sort((a, b) => (a.sortDate as Date).getTime() - (b.sortDate as Date).getTime())
          .map(({ sortDate: _sortDate, ...rest }) => rest);

        // Build series for each category with distinct colors
        // IMPORTANT: Use the original categories order (if provided) to maintain user's requested order
        const categoryColors = ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F87171', '#22D3EE', '#F472B6', '#2DD4BF'];
        const orderedCategories = categories
          ? categories.filter(cat => categorySet.has(cat)) // Use user-specified order, but only include categories that have data
          : Array.from(categorySet); // Fall back to Set order if no categories specified
        const series = orderedCategories.map((cat, idx) => ({
          key: cat,
          name: cat.replace(' & ', ' & '),
          color: categoryColors[idx % categoryColors.length]
        }));

        return {
          chartData: {
            type: chartType,
            data: chartData,
            title,
            currency: userCurrency,
            series
          },
          summary: `Monthly comparison for ${categorySet.size} categories over ${chartData.length} months`,
          total: filteredExpenses.reduce((sum, e) => sum + convertCurrency(e.amount, e.currency || 'USD', userCurrency), 0)
        };
      }

      case 'monthly_trend': {
        // Monthly spending trend (optionally filtered by category)
        let query = supabase
          .from('expenses')
          .select('amount, category, currency, date')
          .eq('user_id', userId)
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        // Filter by single category if provided
        if (category) {
          query = query.eq('category', category);
        }

        const { data: expenses, error } = await query;

        if (error) throw error;

        // Pre-populate all months in the range with zero values
        const monthlyTotals: Record<string, { value: number; sortDate: Date }> = {};
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthlyTotals[monthKey] = { value: 0, sortDate: new Date(currentDate) };
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        expenses?.forEach(e => {
          const date = new Date(e.date);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          const amount = convertCurrency(e.amount, e.currency || 'USD', userCurrency);
          if (monthlyTotals[monthKey]) {
            monthlyTotals[monthKey].value += amount;
          }
        });

        // Sort by date order
        const sortedMonths = Object.entries(monthlyTotals)
          .map(([name, data]) => ({
            name,
            value: Math.round(data.value * 100) / 100,
            sortDate: data.sortDate
          }))
          .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
          .map(({ name, value }) => ({ name, value }));

        const trendLabel = category ? `${category} spending` : 'spending';

        return {
          chartData: {
            type: chartType,
            data: sortedMonths,
            title,
            currency: userCurrency
          },
          summary: `Monthly ${trendLabel} trend for the last ${months} months`,
          total: sortedMonths.reduce((sum, d) => sum + d.value, 0)
        };
      }

      case 'category_breakdown': {
        // Pie chart breakdown by category
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select('amount, category, currency')
          .eq('user_id', userId)
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        if (error) throw error;

        const categoryTotals: Record<string, number> = {};

        expenses?.forEach(e => {
          const amount = convertCurrency(e.amount, e.currency || 'USD', userCurrency);
          categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amount;
        });

        const chartData = Object.entries(categoryTotals)
          .map(([name, value]) => ({
            name: name.replace(' & ', ' & '),
            value: Math.round(value * 100) / 100
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8); // Limit to top 8 for pie chart readability

        return {
          chartData: {
            type: 'pie' as const,
            data: chartData,
            title,
            currency: userCurrency
          },
          summary: `Spending breakdown by category`,
          total: chartData.reduce((sum, d) => sum + d.value, 0)
        };
      }

      case 'income_vs_expenses': {
        // Compare income vs expenses over time
        const [expensesResult, incomeResult] = await Promise.all([
          supabase
            .from('expenses')
            .select('amount, currency, date')
            .eq('user_id', userId)
            .gte('date', startDateStr)
            .lte('date', endDateStr),
          supabase
            .from('income')
            .select('amount, currency, date')
            .eq('user_id', userId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
        ]);

        if (expensesResult.error) throw expensesResult.error;
        if (incomeResult.error) throw incomeResult.error;

        // Pre-populate all months in the range with zero values
        const monthlyData: Record<string, { income: number; expenses: number; sortDate: Date }> = {};
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthlyData[monthKey] = { income: 0, expenses: 0, sortDate: new Date(currentDate) };
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Process income
        incomeResult.data?.forEach(i => {
          const date = new Date(i.date);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].income += convertCurrency(i.amount, i.currency || 'USD', userCurrency);
          }
        });

        // Process expenses
        expensesResult.data?.forEach(e => {
          const date = new Date(e.date);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].expenses += convertCurrency(e.amount, e.currency || 'USD', userCurrency);
          }
        });

        // Sort by date and format
        const chartData = Object.entries(monthlyData)
          .map(([name, data]) => ({
            name,
            income: Math.round(data.income * 100) / 100,
            expenses: Math.round(data.expenses * 100) / 100,
            sortDate: data.sortDate
          }))
          .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
          .map(({ name, income, expenses }) => ({ name, income, expenses }));

        return {
          chartData: {
            type: chartType,
            data: chartData,
            title,
            currency: userCurrency,
            series: [
              { key: 'income', name: 'Income', color: '#10B981' },
              { key: 'expenses', name: 'Expenses', color: '#EF4444' }
            ]
          },
          summary: `Income vs Expenses comparison for the last ${months} months`
        };
      }

      case 'semantic_comparison': {
        // Compare two or more concepts over time using keyword-based classification
        // This is more reliable than semantic search for food delivery vs dine-in comparisons
        const searchConcepts = params.search_concepts as string[] | undefined;
        const conceptLabels = params.concept_labels as string[] | undefined;

        if (!searchConcepts || searchConcepts.length < 2) {
          throw new Error('semantic_comparison requires at least 2 search_concepts');
        }

        const labels = conceptLabels || searchConcepts.map((c, i) => `Concept ${i + 1}`);

        // Pre-populate all months in the range with zero values for each concept
        const monthlyData: Record<string, { concepts: Record<string, number>; sortDate: Date }> = {};
        const currentDateIter = new Date(startDate);
        while (currentDateIter <= endDate) {
          const monthKey = currentDateIter.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthlyData[monthKey] = { concepts: {}, sortDate: new Date(currentDateIter) };
          labels.forEach(label => {
            monthlyData[monthKey].concepts[label] = 0;
          });
          currentDateIter.setMonth(currentDateIter.getMonth() + 1);
        }

        // Fetch ALL Food & Dining expenses for the date range
        const { data: allFoodExpenses, error: fetchError } = await supabase
          .from('expenses')
          .select('id, description, amount, date, currency, category')
          .eq('user_id', userId)
          .eq('category', 'Food & Dining')
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        if (fetchError) {
          console.error('[semantic_comparison] Error fetching expenses:', fetchError);
          throw fetchError;
        }

        console.log(`[semantic_comparison] Fetched ${allFoodExpenses?.length || 0} Food & Dining expenses`);

        // Define food delivery keywords for classification
        const deliveryKeywords = ['grab', 'grabfood', 'foodpanda', 'ubereats', 'doordash', 'deliveroo',
          'gofood', 'shopeefood', 'lalamove', 'delivery'];

        // Detect which label is for delivery and which is for dine-in based on label names
        const deliveryLabelIndex = labels.findIndex(label =>
          label.toLowerCase().includes('delivery') ||
          label.toLowerCase().includes('grab') ||
          label.toLowerCase().includes('panda')
        );
        const dineInLabelIndex = deliveryLabelIndex === 0 ? 1 : 0;
        const deliveryLabel = labels[deliveryLabelIndex >= 0 ? deliveryLabelIndex : 0];
        const dineInLabel = labels[dineInLabelIndex];

        console.log(`[semantic_comparison] Labels: delivery="${deliveryLabel}", dineIn="${dineInLabel}"`);

        // Classify each expense based on description keywords
        const classifiedExpenses: { label: string; expense: typeof allFoodExpenses[0] }[] = [];

        allFoodExpenses?.forEach(expense => {
          const desc = expense.description.toLowerCase();

          // Check if it matches any delivery keyword
          const isDelivery = deliveryKeywords.some(keyword => desc.includes(keyword));

          // Assign to the appropriate label
          if (isDelivery) {
            classifiedExpenses.push({ label: deliveryLabel, expense });
          } else {
            classifiedExpenses.push({ label: dineInLabel, expense });
          }
        });

        // Log classification results
        const deliveryCount = classifiedExpenses.filter(e => e.label === labels[0]).length;
        const dineInCount = classifiedExpenses.filter(e => e.label === labels[1]).length;
        console.log(`[semantic_comparison] Classified: ${deliveryCount} delivery, ${dineInCount} dine-in`);

        // Aggregate expenses by month for each concept
        classifiedExpenses.forEach(({ label, expense }) => {
          const date = new Date(expense.date);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          if (monthlyData[monthKey]) {
            const amount = convertCurrency(expense.amount, expense.currency || 'USD', userCurrency);
            monthlyData[monthKey].concepts[label] += amount;
          }
        });

        // Sort months chronologically and format data
        const chartData = Object.entries(monthlyData)
          .map(([name, data]) => {
            const dataPoint: Record<string, unknown> = { name };
            labels.forEach(label => {
              dataPoint[label] = Math.round((data.concepts[label] || 0) * 100) / 100;
            });
            dataPoint.sortDate = data.sortDate;
            return dataPoint;
          })
          .sort((a, b) => (a.sortDate as Date).getTime() - (b.sortDate as Date).getTime())
          .map(({ sortDate: _sortDate, ...rest }) => rest);

        // Build series for each concept with distinct colors
        const conceptColors = ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F87171'];
        const series = labels.map((label, idx) => ({
          key: label,
          name: label,
          color: conceptColors[idx % conceptColors.length]
        }));

        // Calculate totals for summary
        const totals = labels.map(label => {
          const total = chartData.reduce((sum, d) => sum + (d[label] as number || 0), 0);
          return { label, total: Math.round(total * 100) / 100 };
        });

        console.log(`[semantic_comparison] Totals:`, totals);

        return {
          chartData: {
            type: chartType,
            data: chartData,
            title,
            currency: userCurrency,
            series
          },
          summary: `Comparison of ${labels.join(' vs ')} over ${chartData.length} months`,
          totals,
          searchConcepts
        };
      }

      default:
        throw new Error(`Unknown data query: ${dataQuery}`);
    }
  } catch (error) {
    console.error('[generate_chart] Error:', error);
    throw error;
  }
}

// Gemini API Client
export class GeminiClient {
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  private model = 'gemini-2.5-flash'; // Using Gemini 2.0 Flash Experimental for better function calling support
  private embeddingModel = 'gemini-embedding-001'; // Embedding model for RAG (768 dimensions with outputDimensionality)
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set');
    }
    this.apiKey = apiKey;
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate embeddings for text using Gemini's gemini-embedding-001 model
   * @param text - Text to embed (e.g., "Coffee at Starbucks")
   * @returns 768-dimensional vector embedding
   */
  async getEmbedding(text: string): Promise<number[]> {
    try {
      // Use gemini-embedding-001 with 768 dimensions output
      const response = await this.genAI.models.embedContent({
        model: this.embeddingModel,
        contents: text,
        config: {
          outputDimensionality: 768
        }
      });

      if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
        throw new Error('Invalid embedding response from Gemini API');
      }

      return response.embeddings[0].values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async chat(
    userMessage: string,
    userId: string,
    conversationHistory: Content[] = [],
    selectedMonth?: string
  ): Promise<{
    text: string;
    functionCalled?: string | null;
    functionResult?: Record<string, unknown>;
    history: Content[];
  }> {
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
      const userCurrency = await getUserCurrency(userId);

      // Use selected month from UI or default to current month
      const currentMonth = selectedMonth || today.toISOString().slice(0, 7);

      const systemInstructionText = `You are a helpful financial assistant for a personal finance app.
Current Date: ${dateString} (${weekday}).
User's Default Currency: ${userCurrency}.
User is Currently Viewing: ${currentMonth} (This is the month selected in their budget view)

You can help users track expenses, manage budgets, analyze spending patterns, monitor investments, and provide comprehensive financial insights.
When users ask about their finances, use the available functions to retrieve and analyze their data.
Be conversational, friendly, and provide actionable advice.
Always format currency amounts clearly and provide context for numbers.

MULTI-CURRENCY DISPLAY FORMAT:
When displaying transactions that have different currencies than the user's default (${userCurrency}):
1. Show the ORIGINAL amount and currency first
2. Then add the converted amount in parentheses in the user's currency
3. For totals, ALWAYS show in the user's default currency (${userCurrency})

Example format for multi-currency transactions:
- "Dinner: MYR 50 (SGD 15.00)" - shows original then converted
- "Lunch: SGD 20" - no conversion needed, same as user currency
- "Total: SGD 35.00" - total always in user's currency

When all transactions are in the same currency as user's default, just show the amount normally.
Only show the conversion in parentheses when original_currency differs from display_currency.
When presenting budget information, use the user's default currency (${userCurrency}).

SEMANTIC SEARCH RESULTS:
When presenting results from semantic_search_expenses:
1. Include ALL returned results in your response and total calculation - do not filter out any items
2. Present results clearly with date, description, and amount
3. DO NOT mention low similarity/relevance, filtering, or that some items were excluded
4. DO NOT say things like "I've only included highly relevant transactions" or "other expenses had low semantic similarity"
5. Simply present all the results as a clean list without discussing the search methodology

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

WEEKEND/WEEKDAY FILTERING:
When users ask about spending on "weekends", "weekdays", or specific days of the week:
1. Use the day_of_week_filter parameter in get_expenses function
2. Set day_of_week_filter to:
   - "weekend" for Saturdays and Sundays
   - "weekday" for Monday through Friday
   - Specific day names: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
3. Combine with other filters like category, date range, etc.
4. The function will automatically filter expenses and return only matching transactions

Examples:
- "How much did I spend on food on weekends last month?"
  → Call: get_expenses({ category: "Food & Dining", start_date: "2025-11-01", end_date: "2025-11-30", day_of_week_filter: "weekend" })

- "Show me my transportation expenses on weekdays this month"
  → Call: get_expenses({ category: "Transportation", start_date: "2025-12-01", end_date: "2025-12-31", day_of_week_filter: "weekday" })

- "How much did I spend on Saturdays last month?"
  → Call: get_expenses({ start_date: "2025-11-01", end_date: "2025-11-30", day_of_week_filter: "saturday" })

When presenting results, clearly indicate the day filter applied and provide context.

INVESTMENT CAPABILITIES:
- You can access the user's investment portfolio using get_portfolio function
- You can retrieve individual holdings (stocks, crypto, ETFs, etc.) using get_holdings function
- Portfolio data includes total value, gain/loss, performance, and allocation by asset class
- When users ask about "investments", "portfolio", "stocks", "holdings", use these functions

ASSETS CAPABILITIES (COMPREHENSIVE NET WORTH):
- Use get_assets to retrieve the user's TOTAL NET WORTH including ALL financial data
- get_assets returns comprehensive breakdown with three categories:
  1. Wallets: Cash flow tracking wallets with calculated balances
  2. Portfolio: Investment holdings (stocks, crypto, ETFs) with current values
  3. Assets: Bank accounts, savings, e-wallets, property, vehicles, etc.
- When users ask "how much savings do I have", "what are my assets", "what is my net worth", or "how much money do I have", call get_assets
- The response includes total_net_worth and breakdown by each category
- This is the SINGLE function to use for comprehensive financial overview

CHART VISUALIZATION:
When users ask to "compare", "visualize", "show me a chart/graph", or ask for spending "trends" or "breakdown", use the generate_chart function to create visual charts in the chat.

IMPORTANT - WHEN TO USE CHARTS vs TRANSACTION LISTINGS:
- Use generate_chart for: trends over time, category comparisons, spending breakdowns, visualizations
- Use get_expenses for: "biggest expenses", "largest purchases", "recent transactions", "what did I spend on"

Examples of what SHOULD use get_expenses (show individual transactions):
- "What are my biggest expenses?" → get_expenses with sort_by: "amount", order: "desc", limit: 10
- "What did I spend the most on last month?" → get_expenses with date filters and sort by amount
- "Show my recent purchases" → get_expenses with limit
- "What was my largest purchase?" → get_expenses with sort_by: "amount", limit: 1

TOP EXPENSES RESPONSE FORMAT:
When showing top/biggest expenses, keep it CONCISE:
1. List transactions with amounts
2. One-line summary (e.g., "Total: SGD 1,200. Largest: iPhone (SGD 1,500)")
3. One brief insight (1-2 sentences max, e.g., "💡 Shopping dominates this month due to the iPhone purchase.")

Examples of what SHOULD use generate_chart (show visualizations):
- "Compare my food vs transport spending" → category_comparison with bar chart
- "Show me my spending trend" → monthly_trend with line chart
- "What's my spending breakdown by category?" → category_breakdown with pie chart
- "Visualize my expenses" → category_breakdown with pie chart
- "Chart my income vs expenses" → income_vs_expenses with bar chart

Example function calls:
- User: "Compare my food and transport spending for the last 6 months"
  → Call: generate_chart({ chart_type: "bar", title: "Food vs Transport Spending", data_query: "category_comparison", categories: ["Food & Dining", "Transportation"], months: 6 })

- User: "Show me my spending trend"
  → Call: generate_chart({ chart_type: "line", title: "Monthly Spending Trend", data_query: "monthly_trend", months: 6 })

- User: "Show me my food spending trend" or "Chart my food spending"
  → Call: generate_chart({ chart_type: "line", title: "Food & Dining Spending Trend", data_query: "monthly_trend", category: "Food & Dining", months: 6 })

- User: "What's my spending breakdown this month?"
  → Call: generate_chart({ chart_type: "pie", title: "Spending by Category", data_query: "category_breakdown", months: 1 })

IMPORTANT: When user asks about a SINGLE category trend (e.g., "food spending chart", "show my transport spending"), use the "category" parameter with monthly_trend to filter to just that category. Use "categories" (array) only for category_comparison when comparing multiple categories.

CHART RESPONSE FORMAT - KEEP IT CONCISE:
1. 2-3 bullet points with key observations (specific numbers)
2. One brief insight or tip (1 sentence)
3. Do NOT write long paragraphs or multiple sections

IMPORTANT: Do NOT include raw JSON in your response. The chart renders automatically.

SEMANTIC COMPARISON CHARTS (VERY IMPORTANT):
When users ask to compare concepts that are NOT predefined categories (e.g., "food delivery vs dine-in", "coffee vs bubble tea", "online shopping vs in-store"), use semantic_comparison:

1. Use generate_chart with data_query: "semantic_comparison"
2. Provide search_concepts array with descriptive keywords for each concept
3. Provide concept_labels array with human-readable labels for the chart legend

FOOD DELIVERY VS DINE-IN COMPARISON (COMMON REQUEST):
When user asks "Compare dine in vs food delivery", "List food delivery expenses", "How much do I spend on delivery vs restaurant", or similar:

IMPORTANT: Do NOT use generate_chart with semantic_comparison for this. Instead:
1. First call get_expenses({ category: "Food & Dining", start_date: "[6 months ago]", end_date: "[today]" })
2. Classify each expense yourself based on description keywords:
   - FOOD DELIVERY keywords: grab, grabfood, foodpanda, ubereats, doordash, deliveroo, gofood, shopeefood, lalamove, delivery
   - DINE-IN: Everything else in Food & Dining (restaurants, cafes, hawker centres, etc.)
3. Present a clear breakdown with totals for each category
4. For comparison requests, present the data in a clear summary table format (NOT a chart)

Example response format:
"Here are your food expenses classified:

🛵 **Food Delivery (Total: SGD X)**
- GrabFood pizza: SGD 25
- FoodPanda order: SGD 18

🍽️ **Dine-In (Total: SGD Y)**
- Sushi Express: SGD 23
- Starbucks Coffee: SGD 8
- Hawker Centre: SGD 5

**Summary: You spent SGD X on food delivery and SGD Y on dine-in over the past 6 months.**"

This approach is more reliable because it uses exact keyword matching on expense descriptions.


COMMON SEMANTIC COMPARISON EXAMPLES:
- "Compare coffee vs bubble tea spending" →
  search_concepts: ["coffee starbucks latte espresso cappuccino", "bubble tea boba milk tea"]
  concept_labels: ["Coffee", "Bubble Tea"]

- "How much do I spend on online shopping vs in-store?" →
  search_concepts: ["online shopping amazon lazada shopee ecommerce", "mall store retail in-store physical"]
  concept_labels: ["Online Shopping", "In-Store"]

EXPENSE CREATION - AUTO-CATEGORIZATION (IMPORTANT):
When users add expenses via chat, AUTOMATICALLY categorize common expense types WITHOUT asking for category:

ALWAYS use "Food & Dining" for:
- lunch, dinner, breakfast, brunch, meal, snack
- coffee, cafe, starbucks, tea
- restaurant, bistro, dining
- food delivery (grabfood, foodpanda, ubereats, etc.)
- any food/beverage-related expense

ALWAYS use "Transportation" for:
- uber, grab, lyft, taxi, ride
- mrt, bus, train, transit
- parking, petrol, gas, fuel

ALWAYS use "Miscellaneous" for:
- unclear items that don't fit obvious categories

Examples (DO NOT ask for category for these):
- "I just had lunch for $15" → create_expense({ amount: 15, description: "Lunch", category: "Food & Dining", date: "${dateString}" })
- "Coffee $5" → create_expense({ amount: 5, description: "Coffee", category: "Food & Dining", date: "${dateString}" })
- "Grab ride $12" → create_expense({ amount: 12, description: "Grab Ride", category: "Transportation", date: "${dateString}" })

Only ask for category clarification when the item is genuinely ambiguous (e.g., "bought something for $50").


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

CRITICAL - SPENDING COMPARISON QUESTIONS (MUST FOLLOW):
When users ask SPENDING comparison questions like "Am I spending more than last month?", "How does my dining spending compare?", "compare grocery this month and last month", or "Am I spending more on [category] compared to last month?":

1. Call get_spending_summary with period: "this_month", group_by: "category", include_comparison: true to get the comparison numbers
2. ALSO call get_expenses TWICE to get the individual expense listings:
   - get_expenses({ category: "[category]", start_date: "[this_month_start]", end_date: "[this_month_end]" }) for this month's expenses
   - get_expenses({ category: "[category]", start_date: "[last_month_start]", end_date: "[last_month_end]" }) for last month's expenses
3. NEVER say "I need to check", "Let me get", "Please allow me a moment" - respond with the comparison AND listings DIRECTLY
4. The get_spending_summary result includes:
   - comparison.previous_total and comparison.change_percent for OVERALL spending comparison
   - category_comparison field with per-category data: { category_name: { current, previous, change, change_percent } }
5. Present BOTH the summary comparison AND list the individual expenses from both months

CRITICAL EXAMPLES - FOLLOW THESE PATTERNS EXACTLY:
User: "Compare grocery this month and last month"
→ Call: get_spending_summary({ period: "this_month", group_by: "category", include_comparison: true })
→ Call: get_expenses({ category: "Groceries", start_date: "2026-01-01", end_date: "2026-01-31" })
→ Call: get_expenses({ category: "Groceries", start_date: "2025-12-01", end_date: "2025-12-31" })
→ Use category_comparison["Groceries"] for the comparison numbers
→ Respond with:
  - The comparison: "This month SGD [current] vs last month SGD [previous] ([change_percent]% more/less)"
  - This month's expenses list
  - Last month's expenses list

User: "Am I spending more on dining out compared to last month?"
→ Call: get_spending_summary({ period: "this_month", group_by: "category", include_comparison: true })
→ Call: get_expenses({ category: "Food & Dining", start_date: "[this_month_start]", end_date: "[this_month_end]" })
→ Call: get_expenses({ category: "Food & Dining", start_date: "[last_month_start]", end_date: "[last_month_end]" })
→ Respond with comparison AND expense listings

User: "How does my spending this month compare to last month?" (overall, not category-specific)
→ Call ONCE: get_spending_summary({ period: "this_month", group_by: "category", include_comparison: true })
→ Respond with overall comparison and category breakdown (no need to list individual expenses for overall comparison)

OTHER RULES:
- If multiple expenses in one message, call create_expense multiple times
- Always report financial totals in ${userCurrency}
- Always mention which month you're reporting (e.g., "For ${currentMonth}...")

EXAMPLE FUNCTION CALLS:
User: "How am I doing with my budgets?"
→ Call: get_budget({ month: "${currentMonth}", include_spent: true })

User: "Check my food budget"
→ Call: get_budget({ category: "Food & Dining", month: "${currentMonth}", include_spent: true })`;

      // Create chat session with the new SDK
      const chat = this.genAI.chats.create({
        model: this.model,
        config: {
          systemInstruction: systemInstructionText,
          tools: [{
            functionDeclarations: functions
          }]
        },
        history: conversationHistory
      });

      // Send user message
      const result = await chat.sendMessage({
        message: userMessage
      });

      // Extract function call parts from the full response (to preserve thoughtSignature)
      const responseParts = result.candidates?.[0]?.content?.parts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const functionCallParts = responseParts.filter(p => (p as any).functionCall);

      if (functionCallParts.length > 0) {
        console.log(`Gemini wants to call ${functionCallParts.length} functions`);
        console.log('[chat] Function call parts:', JSON.stringify(functionCallParts, null, 2));

        // Execute all functions in parallel, preserving the thoughtSignature from each part
        const executionResults = await Promise.all(
          functionCallParts.map(async (part: Part) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fc = (part as any).functionCall;
            const functionName = fc.name as string;
            const functionArgs = fc.args as Record<string, unknown>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const thoughtSignature = (part as any).thoughtSignature as string | undefined;

            console.log(`Calling function: ${functionName}`, functionArgs);
            const functionResult = await executeFunction(functionName, functionArgs, userId, userCurrency);

            return {
              name: functionName,
              result: functionResult,
              thoughtSignature
            };
          })
        );

        // Build functionResponse parts, including the original thoughtSignature (or dummy if missing)
        const functionResponseParts: Part[] = executionResults.map(r => ({
          functionResponse: {
            name: r.name,
            response: r.result
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          // If thoughtSignature is missing, use documented dummy value to bypass validator
          // See: https://github.com/sst/opencode/issues/4832
          thoughtSignature: r.thoughtSignature ?? 'skip_thought_signature_validator'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any));

        const followUpResult = await chat.sendMessage({
          // SDK accepts a single part or array of parts
          message: functionResponseParts.length === 1 ? functionResponseParts[0] : functionResponseParts
        });

        const finalResponse = followUpResult.text;

        // Debug: Log the full response to see structure
        console.log('[chat] Full follow-up result:', JSON.stringify(followUpResult, null, 2));

        // Aggregate results for the UI
        const functionNames = executionResults.map(r => r.name).join(', ');
        const totalSuccess = executionResults.length;

        // Get the complete history from the chat session (includes thought signatures)
        const chatHistory = chat.getHistory();

        // Extract chartData if generate_chart was called
        const chartResult = executionResults.find(r => r.name === 'generate_chart');
        const chartData = chartResult?.result?.chartData as Record<string, unknown> | undefined;

        // Build the function result object
        const functionResultObj: Record<string, unknown> = {
          success: true,
          message: `Executed ${totalSuccess} action${totalSuccess > 1 ? 's' : ''}`,
          count: totalSuccess
        };

        if (chartData) {
          functionResultObj.chartData = chartData;
        }

        // Include expense details if create_expense was called (for UI toast)
        const expenseResults = executionResults.filter(r => r.name === 'create_expense');
        if (expenseResults.length > 0) {
          const createdExpenses = expenseResults.map(r => {
            const expense = r.result?.expense as { description: string; amount: number; currency: string; date: string } | undefined;
            return expense ? {
              description: expense.description,
              amount: expense.amount,
              currency: expense.currency,
              date: expense.date
            } : null;
          }).filter(Boolean);

          if (createdExpenses.length > 0) {
            functionResultObj.createdExpenses = createdExpenses;
            // Calculate total for all created expenses
            const total = createdExpenses.reduce((sum, exp: { amount: number } | null) => sum + (exp?.amount || 0), 0);
            functionResultObj.expenseTotal = total;
            // Get the earliest date for navigation
            const earliestDate = createdExpenses.reduce((earliest, exp: { date: string } | null) => {
              if (!exp?.date) return earliest;
              return exp.date < earliest ? exp.date : earliest;
            }, createdExpenses[0]?.date || new Date().toISOString().split('T')[0]);
            functionResultObj.earliestExpenseDate = earliestDate;
          }
        }

        return {
          text: finalResponse || '',
          functionCalled: functionNames,
          functionResult: functionResultObj,
          history: chatHistory
        };
      }

      // No function call - get the model response from chat history
      const chatHistory = chat.getHistory();

      return {
        text: result.text || '',
        functionCalled: null,
        history: chatHistory
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const gemini = new GeminiClient();

