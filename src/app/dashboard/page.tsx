'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, Calendar, Sparkles, AlertTriangle, CheckCircle, Info, Lightbulb, Target as TargetIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { supabase } from '@/lib/supabase';
import { useMemo, useState, useEffect, useRef } from 'react';
import { getCurrencyFormatter } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';
import Link from 'next/link';

interface UserSettings {
  currency?: string;
  [key: string]: unknown;
}

interface IncomeRecord {
  amount: number;
  date: string;
  currency?: string;
  [key: string]: unknown;
}

interface AssetRecord {
  amount: number;
  currency?: string;
  [key: string]: unknown;
}

interface HoldingRecord {
  shares: number;
  current_price?: number;
  average_price?: number;
  currency?: string;
  [key: string]: unknown;
}

interface MonthlyStatRecord {
  month: string;
  total_net_worth?: number;
  [key: string]: unknown;
}

interface Budget {
  id: string;
  category: string;
  allocated_amount: number;
  currency?: string;
  [key: string]: unknown;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  currency?: string;
  [key: string]: unknown;
}

export default function Dashboard() {
  const { expenses, subscriptions } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [spendingPeriod, setSpendingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatRecord[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insightsPage, setInsightsPage] = useState(0);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    if (isLoadingRef.current) return;

    let mounted = true;
    isLoadingRef.current = true;

    const loadData = async () => {
      try {
        // Load user settings
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (mounted && settingsData) setUserSettings(settingsData);

        // Load income
        const { data: incomeData, error: incomeError } = await supabase
          .from('income')
          .select('*')
          .order('date', { ascending: false });
        if (mounted && !incomeError) setIncome(incomeData || []);

        // Load assets
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*');
        if (mounted && !assetsError) setAssets(assetsData || []);

        // Load holdings (for portfolio value in net worth)
        const { data: holdingsData, error: holdingsError } = await supabase
          .from('holdings')
          .select('*');
        if (mounted && !holdingsError) setHoldings(holdingsData || []);

        // Load monthly stats for net worth trend
        const { data: statsData, error: statsError } = await supabase
          .from('monthly_stats')
          .select('*')
          .eq('user_id', user.id)
          .order('month', { ascending: true });
        if (mounted && !statsError) setMonthlyStats(statsData || []);

        // Load budgets
        const { data: budgetsData, error: budgetsError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id);
        if (mounted && !budgetsError) setBudgets(budgetsData || []);

        // Load goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id);
        if (mounted && !goalsError) setGoals(goalsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadData();

    return () => {
      mounted = false;
      isLoadingRef.current = false;
    };
  }, [user?.id]);


  // Filter expenses by selected month
  const monthExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      return expMonth === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Filter income by selected month
  const monthIncome = useMemo(() => {
    return income.filter(inc => {
      const incDate = new Date(inc.date);
      const incMonth = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
      return incMonth === selectedMonth;
    });
  }, [income, selectedMonth]);

  // Get previous month data for comparison
  const previousMonthData = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1); // month - 2 because months are 0-indexed
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const prevExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      return expMonth === prevMonth;
    });

    const prevIncome = income.filter(inc => {
      const incDate = new Date(inc.date);
      const incMonth = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
      return incMonth === prevMonth;
    });

    // Convert previous month expenses to profile currency
    const prevExpensesTotal = prevExpenses.reduce((sum, exp) => {
      const amountInProfileCurrency = convertCurrency(
        exp.amount,
        (exp as { currency?: string }).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);

    // Convert previous month income to profile currency
    const prevIncomeTotal = prevIncome.reduce((sum, inc) => {
      const amountInProfileCurrency = convertCurrency(
        inc.amount,
        (inc as IncomeRecord).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);

    return {
      expenses: prevExpensesTotal,
      income: prevIncomeTotal
    };
  }, [expenses, income, selectedMonth, userSettings]);

  // Calculate real financial data for selected month with comparisons
  const financialStats = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';

    const totalExpenses = monthExpenses.reduce((sum, exp) => {
      const amountInProfileCurrency = convertCurrency(
        exp.amount,
        (exp as { currency?: string }).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);

    const totalIncome = monthIncome.reduce((sum, inc) => {
      const amountInProfileCurrency = convertCurrency(
        inc.amount,
        (inc as IncomeRecord).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);

    const totalAssets = assets.reduce((sum, asset) => {
      const amountInProfileCurrency = convertCurrency(
        asset.amount,
        (asset as AssetRecord).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);

    // Include portfolio value in net worth
    const totalPortfolioValue = holdings.reduce((sum, holding) => {
      const currentPrice = holding.current_price || holding.average_price || 0;
      const valueInHoldingCurrency = holding.shares * currentPrice;
      const valueInProfileCurrency = convertCurrency(
        valueInHoldingCurrency,
        holding.currency || 'USD',
        profileCurrency
      );
      return sum + valueInProfileCurrency;
    }, 0);

    // Determine if selected month is current month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = selectedMonth === currentMonthKey;

    // Check if user has any transactions for the selected month
    const hasTransactionsForMonth = monthExpenses.length > 0 || monthIncome.length > 0;

    // Helper to get month balance
    const getMonthBalance = (monthKey: string) => {
      const mIncome = income
        .filter(inc => {
          const incDate = new Date(inc.date);
          return `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
        })
        .reduce((sum, inc) => sum + convertCurrency(inc.amount, (inc as IncomeRecord).currency || 'USD', profileCurrency), 0);

      const mExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
        })
        .reduce((sum, exp) => sum + convertCurrency(exp.amount, (exp as { currency?: string }).currency || 'USD', profileCurrency), 0);

      return mIncome - mExpenses;
    };

    // Net worth logic:
    // - Current month: calculate live (assets + portfolio)
    // - Past month WITH monthly_stats: use recorded value
    // - Past month WITH transactions but NO monthly_stats: calculate backwards from current
    // - Past month with NO transactions AND NO monthly_stats: show 0
    let totalNetWorth: number;
    const liveNetWorth = totalAssets + totalPortfolioValue;

    if (isCurrentMonth) {
      // Current month: calculate live
      totalNetWorth = liveNetWorth;
    } else {
      // Past month: find recorded stats
      const selectedMonthStats = monthlyStats.find(stat => {
        const statDate = new Date(stat.month);
        const statKey = `${statDate.getFullYear()}-${String(statDate.getMonth() + 1).padStart(2, '0')}`;
        return statKey === selectedMonth;
      });

      if (selectedMonthStats?.total_net_worth !== undefined) {
        // Has recorded monthly stats - use it
        totalNetWorth = selectedMonthStats.total_net_worth;
      } else if (hasTransactionsForMonth) {
        // Calculate backwards from current month
        // Sum up all balances from selected month to current month
        const [selYear, selMonth] = selectedMonth.split('-').map(Number);
        const selectedDate = new Date(selYear, selMonth - 1, 1);

        let cumulativeBalance = 0;
        const tempDate = new Date(selectedDate);
        while (tempDate <= now) {
          const tempKey = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`;
          cumulativeBalance += getMonthBalance(tempKey);
          tempDate.setMonth(tempDate.getMonth() + 1);
        }

        // Selected month net worth = current - cumulative balance from selected to current
        totalNetWorth = liveNetWorth - cumulativeBalance + getMonthBalance(selectedMonth);
      } else {
        // No transactions and no monthly_stats - show 0
        totalNetWorth = 0;
      }
    }

    // Calculate percentage changes from previous month
    const incomeChange = previousMonthData.income > 0
      ? ((totalIncome - previousMonthData.income) / previousMonthData.income) * 100
      : 0;

    const expenseChange = previousMonthData.expenses > 0
      ? ((totalExpenses - previousMonthData.expenses) / previousMonthData.expenses) * 100
      : 0;

    // Get previous month's net worth from monthly_stats for change calculation
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthStats = monthlyStats.find(stat => {
      const statDate = new Date(stat.month);
      const statKey = `${statDate.getFullYear()}-${String(statDate.getMonth() + 1).padStart(2, '0')}`;
      return statKey === prevKey;
    });

    // Calculate net worth change
    const netWorthChange = prevMonthStats?.total_net_worth && prevMonthStats.total_net_worth > 0
      ? ((totalNetWorth - prevMonthStats.total_net_worth) / prevMonthStats.total_net_worth) * 100
      : 0;

    return {
      income: { amount: totalIncome, change: incomeChange },
      expenses: { amount: totalExpenses, change: expenseChange },
      netWorth: { amount: totalNetWorth, change: netWorthChange }
    };
  }, [monthExpenses, monthIncome, assets, holdings, previousMonthData, monthlyStats, selectedMonth, userSettings, expenses, income]);

  const formatCurrency = useMemo(() => getCurrencyFormatter(userSettings?.currency || 'USD'), [userSettings?.currency]);

  // Calculate spending by category from real data for selected month or year
  const spendingByCategory = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const profileCurrency = userSettings?.currency || 'USD';

    // Filter expenses based on period
    const relevantExpenses = spendingPeriod === 'monthly'
      ? monthExpenses
      : expenses.filter(exp => {
        const expenseYear = new Date(exp.date).getFullYear();
        const selectedYear = parseInt(selectedMonth.split('-')[0]);
        return expenseYear === selectedYear;
      });

    relevantExpenses.forEach(exp => {
      // Convert each expense to profile currency
      const expenseInProfileCurrency = convertCurrency(
        exp.amount,
        (exp as { currency?: string }).currency || 'USD',
        profileCurrency
      );
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + expenseInProfileCurrency;
    });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

    return {
      total,
      categories: Object.entries(categoryTotals)
        .map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length],
          percentage: total > 0 ? Math.round((value / total) * 100) : 0
        }))
        .sort((a, b) => b.value - a.value)
    };
  }, [monthExpenses, expenses, selectedMonth, spendingPeriod, userSettings]);

  // Get recent expenses for selected month (last 5)
  const _recentExpensesList = useMemo(() => {
    return monthExpenses.slice(0, 5).map(exp => ({
      date: new Date(exp.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      description: exp.description,
      category: exp.category,
      amount: -exp.amount,
      currency: (exp as { currency?: string }).currency || 'USD' // Include currency from expense
    }));
  }, [monthExpenses]);

  // Calculate monthly spending for last 12 months
  const monthlySpendingData = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const data = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

      const monthTotal = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getFullYear() === date.getFullYear() && expDate.getMonth() === date.getMonth();
        })
        .reduce((sum, exp) => {
          const amountInProfileCurrency = convertCurrency(
            exp.amount,
            (exp as { currency?: string }).currency || 'USD',
            profileCurrency
          );
          return sum + amountInProfileCurrency;
        }, 0);

      data.push({
        month: monthLabel,
        value: monthTotal
      });
    }

    return data;
  }, [expenses, userSettings]);

  // Calculate cashflow data (Income vs Expenses) for last 12 months
  const cashflowData = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const data = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getFullYear() === date.getFullYear() && expDate.getMonth() === date.getMonth();
        })
        .reduce((sum, exp) => {
          const amountInProfileCurrency = convertCurrency(
            exp.amount,
            (exp as { currency?: string }).currency || 'USD',
            profileCurrency
          );
          return sum + amountInProfileCurrency;
        }, 0);

      const monthIncome = income
        .filter(inc => {
          const incDate = new Date(inc.date);
          return incDate.getFullYear() === date.getFullYear() && incDate.getMonth() === date.getMonth();
        })
        .reduce((sum, inc) => {
          const amountInProfileCurrency = convertCurrency(
            inc.amount,
            (inc as IncomeRecord).currency || 'USD',
            profileCurrency
          );
          return sum + amountInProfileCurrency;
        }, 0);

      data.push({
        month: monthLabel,
        income: Math.round(monthIncome * 100) / 100,
        expenses: Math.round(monthExpenses * 100) / 100
      });
    }

    return data;
  }, [expenses, income, userSettings]);

  // Calculate savings rate for current month
  const savingsRate = useMemo(() => {
    const totalExpenses = monthExpenses.reduce((sum, exp) => {
      const amountInProfileCurrency = convertCurrency(
        exp.amount,
        (exp as { currency?: string }).currency || 'USD',
        userSettings?.currency || 'USD'
      );
      return sum + amountInProfileCurrency;
    }, 0);

    const totalIncome = monthIncome.reduce((sum, inc) => {
      const amountInProfileCurrency = convertCurrency(
        inc.amount,
        (inc as IncomeRecord).currency || 'USD',
        userSettings?.currency || 'USD'
      );
      return sum + amountInProfileCurrency;
    }, 0);

    if (totalIncome === 0) return 0;
    return Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
  }, [monthExpenses, monthIncome, userSettings]);

  // Strategy: Calculate net worth backwards from current month
  // - Current month: live calculation (assets + portfolio)
  // - Previous month: next_month - (that_month_income - that_month_expenses)
  // - If monthly_stats exists, use that instead
  // - If no transactions for a month, show 0
  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: Array<{
      id: string;
      type: 'error' | 'success' | 'warning' | 'info';
      title: string;
      description: string;
      action?: { text: string; link: string };
    }> = [];

    const profileCurrency = userSettings?.currency || 'USD';

    // 1. Budget Alerts - Check for exceeded budgets
    budgets.forEach(budget => {
      const budgetCurrency = budget.currency || profileCurrency;
      const categorySpending = monthExpenses
        .filter(exp => exp.category === budget.category)
        .reduce((sum, exp) => {
          const expenseCurrency = (exp as { currency?: string }).currency || 'USD';
          const convertedAmount = convertCurrency(exp.amount, expenseCurrency, budgetCurrency);
          return sum + convertedAmount;
        }, 0);

      const percentage = budget.allocated_amount > 0 ? (categorySpending / budget.allocated_amount) * 100 : 0;

          if (percentage > 100) {
        const overspent = categorySpending - budget.allocated_amount;
        insights.push({
          id: `budget-exceeded-${budget.id}`,
          type: 'error',
          title: `${budget.category} Budget Exceeded`,
          description: `You've spent ${getCurrencyFormatter(budgetCurrency)(categorySpending)} on ${budget.category}, which is ${percentage.toFixed(0)}% over your monthly budget of ${getCurrencyFormatter(budgetCurrency)(budget.allocated_amount)}.`,
          action: { text: 'Review recent expenses →', link: '/expenses' }
        });
      } else if (percentage > 80 && percentage <= 100) {
        insights.push({
          id: `budget-warning-${budget.id}`,
          type: 'warning',
          title: `${budget.category} Budget Almost Reached`,
          description: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget. ${getCurrencyFormatter(budgetCurrency)(budget.allocated_amount - categorySpending)} remaining.`,
          action: { text: 'View budget →', link: '/budget' }
        });
      }
    });

    // 2. Savings Achievements - Compare to previous month
    const currentExpenses = financialStats.expenses.amount;
    const previousExpenses = previousMonthData.expenses;

    if (previousExpenses > 0 && currentExpenses < previousExpenses) {
      const savedAmount = previousExpenses - currentExpenses;
      const percentageSaved = ((savedAmount / previousExpenses) * 100);
      
      if (percentageSaved > 10) {
        insights.push({
          id: 'savings-achievement',
          type: 'success',
          title: 'Great Savings This Month!',
          description: `Your expenses are ${percentageSaved.toFixed(1)}% lower than last month. You saved an extra ${formatCurrency(savedAmount)}.`
        });
      }
    }

    // 3. Unusual Spending Patterns - Detect spikes in categories
    const categorySpending: Record<string, { current: number; previous: number }> = {};
    
    // Calculate current month spending by category
    monthExpenses.forEach(exp => {
      if (!categorySpending[exp.category]) {
        categorySpending[exp.category] = { current: 0, previous: 0 };
      }
      const converted = convertCurrency(
        exp.amount,
        (exp as { currency?: string }).currency || 'USD',
        profileCurrency
      );
      categorySpending[exp.category].current += converted;
    });

    // Calculate previous 3-month average by category
    const [year, month] = selectedMonth.split('-').map(Number);
    for (let i = 1; i <= 3; i++) {
      const prevDate = new Date(year, month - 1 - i, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      
      expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
          return expMonth === prevMonth;
        })
        .forEach(exp => {
          if (!categorySpending[exp.category]) {
            categorySpending[exp.category] = { current: 0, previous: 0 };
          }
          const converted = convertCurrency(
            exp.amount,
            (exp as { currency?: string }).currency || 'USD',
            profileCurrency
          );
          categorySpending[exp.category].previous += converted / 3; // Average over 3 months
        });
    }

    // Detect unusual patterns
    Object.entries(categorySpending).forEach(([category, amounts]) => {
      if (amounts.previous > 0) {
        const increase = ((amounts.current - amounts.previous) / amounts.previous) * 100;
        if (increase > 50 && amounts.current > 100) { // At least 50% increase and more than 100 units
          insights.push({
            id: `unusual-spending-${category}`,
            type: 'warning',
            title: `Unusual ${category} Spending`,
            description: `${category} costs increased by ${increase.toFixed(0)}% compared to your 3-month average. Consider reviewing your recent purchases.`,
            action: { text: `View ${category.toLowerCase()} history →`, link: '/expenses' }
          });
        }
      }
    });

    // 4. Investment Recommendations - Based on savings balance
    const savingsBalance = assets.reduce((sum, asset) => {
      if ((asset as { type?: string }).type === 'savings') {
        return sum + convertCurrency(asset.amount, asset.currency || 'USD', profileCurrency);
      }
      return sum;
    }, 0);

    if (savingsBalance > 5000 && holdings.length === 0) {
      insights.push({
        id: 'investment-opportunity',
        type: 'info',
        title: 'Investment Opportunity',
        description: `You have ${formatCurrency(savingsBalance)} in savings. Consider investing 20-30% in diversified index funds for long-term growth.`,
        action: { text: 'Explore investment options →', link: '/investments' }
      });
    }

    // 5. Goal Tracking - Show progress toward goals
    goals.forEach(goal => {
      const goalCurrency = goal.currency || profileCurrency;
      const currentAmount = goal.current_amount || 0;
      const progress = (currentAmount / goal.target_amount) * 100;
      const targetDate = new Date(goal.target_date);
      const now = new Date();
      const monthsRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));

      if (progress >= 90 && monthsRemaining > 0) {
        insights.push({
          id: `goal-almost-reached-${goal.id}`,
          type: 'success',
          title: `Almost Reached: ${goal.name}`,
          description: `You're at ${progress.toFixed(0)}% of your ${getCurrencyFormatter(goalCurrency)(goal.target_amount)} goal. Just ${getCurrencyFormatter(goalCurrency)(goal.target_amount - currentAmount)} more to go!`,
          action: { text: 'View goals →', link: '/goals' }
        });
      } else if (monthsRemaining > 0 && progress > 0) {
        const monthlyRequired = (goal.target_amount - currentAmount) / monthsRemaining;
        const currentMonthlySavings = financialStats.income.amount - financialStats.expenses.amount;
        
        if (currentMonthlySavings >= monthlyRequired) {
          insights.push({
            id: `goal-on-track-${goal.id}`,
            type: 'success',
            title: `On Track for ${goal.name}`,
            description: `At your current savings rate, you'll exceed your ${getCurrencyFormatter(goalCurrency)(goal.target_amount)} goal by ${getCurrencyFormatter(goalCurrency)(currentMonthlySavings * monthsRemaining - (goal.target_amount - currentAmount))}.`,
            action: { text: 'View goals →', link: '/goals' }
          });
        }
      }
    });

    // Sort insights by priority: error > warning > info > success
    const priorityOrder = { error: 0, warning: 1, info: 2, success: 3 };
    insights.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

    return insights;
  }, [budgets, goals, monthExpenses, expenses, financialStats, previousMonthData, selectedMonth, userSettings, formatCurrency, assets, holdings]);

  // Paginate insights - show 3 per page
  const paginatedInsights = useMemo(() => {
    const INSIGHTS_PER_PAGE = 3;
    const start = insightsPage * INSIGHTS_PER_PAGE;
    return aiInsights.slice(start, start + INSIGHTS_PER_PAGE);
  }, [aiInsights, insightsPage]);

  const totalPages = Math.ceil(aiInsights.length / 3);

  // Reset to first page when insights change
  useEffect(() => {
    setInsightsPage(0);
  }, [aiInsights.length]);

  const nextPage = () => {
    if (insightsPage < totalPages - 1) {
      setInsightsPage(insightsPage + 1);
    }
  };

  const prevPage = () => {
    if (insightsPage > 0) {
      setInsightsPage(insightsPage - 1);
    }
  };

  const netWorthTrend = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const profileCurrency = userSettings?.currency || 'USD';

    // Build a map of monthly stats for quick lookup
    const statsMap = new Map<string, number>();
    monthlyStats.forEach(stat => {
      const monthDate = new Date(stat.month);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      statsMap.set(monthKey, stat.total_net_worth || 0);
    });

    // Calculate current net worth (live)
    const currentTotalAssets = assets.reduce((sum, asset) => {
      return sum + convertCurrency(asset.amount, (asset as AssetRecord).currency || 'USD', profileCurrency);
    }, 0);

    const currentTotalPortfolio = holdings.reduce((sum, holding) => {
      const currentPrice = holding.current_price || holding.average_price || 0;
      const valueInHoldingCurrency = holding.shares * currentPrice;
      return sum + convertCurrency(valueInHoldingCurrency, holding.currency || 'USD', profileCurrency);
    }, 0);

    const currentNetWorth = currentTotalAssets + currentTotalPortfolio;

    // Helper function to get month's balance (income - expenses)
    const getMonthBalance = (monthKey: string) => {
      const monthIncome = income
        .filter(inc => {
          const incDate = new Date(inc.date);
          const incKey = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
          return incKey === monthKey;
        })
        .reduce((sum, inc) => sum + convertCurrency(inc.amount, (inc as IncomeRecord).currency || 'USD', profileCurrency), 0);

      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          const expKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
          return expKey === monthKey;
        })
        .reduce((sum, exp) => sum + convertCurrency(exp.amount, (exp as { currency?: string }).currency || 'USD', profileCurrency), 0);

      return { income: monthIncome, expenses: monthExpenses, balance: monthIncome - monthExpenses };
    };

    // Check if month has any transactions
    const hasTransactions = (monthKey: string) => {
      const { income: inc, expenses: exp } = getMonthBalance(monthKey);
      return inc > 0 || exp > 0;
    };

    // Build array of months from oldest to newest (i=11 is oldest, i=0 is current)
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key: monthKey, label: monthLabel });
    }

    // Calculate backwards from current month
    // Start from the end (current month) and work backwards
    const netWorthByMonth = new Map<string, number>();

    for (let i = months.length - 1; i >= 0; i--) {
      const { key: monthKey } = months[i];

      if (monthKey === currentMonthKey) {
        // Current month: live calculation
        netWorthByMonth.set(monthKey, currentNetWorth);
      } else if (statsMap.has(monthKey)) {
        // Has recorded monthly_stats - use it
        netWorthByMonth.set(monthKey, statsMap.get(monthKey)!);
      } else if (hasTransactions(monthKey)) {
        // No monthly_stats but has transactions - calculate backwards
        // This month's net worth = next month's net worth - this month's balance
        const nextMonthKey = months[i + 1]?.key;
        const nextMonthNetWorth = nextMonthKey ? (netWorthByMonth.get(nextMonthKey) || currentNetWorth) : currentNetWorth;
        const { balance } = getMonthBalance(monthKey);
        netWorthByMonth.set(monthKey, nextMonthNetWorth - balance);
      } else {
        // No transactions and no monthly_stats - show 0
        netWorthByMonth.set(monthKey, 0);
      }
    }

    // Build final data array
    const data = months.map(({ key, label }) => ({
      month: label,
      value: Math.round((netWorthByMonth.get(key) || 0) * 100) / 100
    }));

    return data;
  }, [assets, holdings, income, expenses, monthlyStats, userSettings]);



  return (
    <div className="p-6 min-h-screen bg-[var(--background)] transition-colors duration-300">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-slide-in-up">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}</p>
        </div>

        {/* Month Selector */}
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>

      {/* Main Layout */}
      <div className="mb-8">
        {/* Row 1: Summary Cards (Full Width) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Link href="/income" className="glass-card rounded-2xl p-6 cursor-pointer group animate-scale-in h-[160px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--text-secondary)] text-lg font-semibold">Income</h3>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(financialStats.income.amount)}</p>
                  <div className="flex items-center mt-2 mb-2">
                    {financialStats.income.change >= 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-[var(--accent-success)] mr-1" />
                        <span className="text-[var(--accent-success)] text-sm font-medium">+{financialStats.income.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-[var(--accent-error)] mr-1" />
                        <span className="text-[var(--accent-error)] text-sm font-medium">{financialStats.income.change.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-[var(--text-tertiary)] text-xs ml-1">vs prev month</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/expenses" className="glass-card rounded-2xl p-6 cursor-pointer group animate-scale-in h-[160px] flex flex-col justify-between" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--text-secondary)] text-lg font-semibold">Expenses</h3>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(financialStats.expenses.amount)}</p>
                  <div className="flex items-center mt-2 mb-2">
                    {financialStats.expenses.change >= 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-[var(--accent-error)] mr-1" />
                        <span className="text-[var(--accent-error)] text-sm font-medium">+{financialStats.expenses.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-[var(--accent-success)] mr-1" />
                        <span className="text-[var(--accent-success)] text-sm font-medium">{financialStats.expenses.change.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-[var(--text-tertiary)] text-xs ml-1">vs prev month</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/assets" className="glass-card rounded-2xl p-6 cursor-pointer group animate-scale-in h-[160px] flex flex-col justify-between" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--text-secondary)] text-lg font-semibold">Net Worth</h3>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(financialStats.netWorth.amount)}</p>
                  <div className="flex items-center mt-2 mb-2">
                    {financialStats.netWorth.change >= 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-[var(--accent-success)] mr-1" />
                        <span className="text-[var(--accent-success)] text-sm font-medium">+{financialStats.netWorth.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-[var(--accent-error)] mr-1" />
                        <span className="text-[var(--accent-error)] text-sm font-medium">{financialStats.netWorth.change.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-[var(--text-tertiary)] text-xs ml-1">vs prev month</span>
                  </div>
                </div>
              </div>
            </Link>
        </div>

        {/* Row 2 & 3: Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Spending Chart - Row 2, Column 1 */}
          <div className="lg:col-span-4">
          {/* Monthly Spending Chart */}
          <div className="glass-card rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '300ms' }}>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Last 12 Month Spending</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySpendingData}>
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value: number) => [`Spending: ${formatCurrency(Number(Number(value).toFixed(2)))}`, '']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </div>
          </div>

          {/* Spending by Category - Row 2, Column 2 */}
          <div className="lg:col-span-4">
            <div className="glass-card rounded-2xl p-6 animate-slide-in-up h-full" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Expenses Category
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSpendingPeriod('monthly')}
                    className={`px-3 py-1.5 text-sm rounded-xl transition-all duration-300 font-medium liquid-button ${spendingPeriod === 'monthly'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                      }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSpendingPeriod('yearly')}
                    className={`px-3 py-1.5 text-sm rounded-xl transition-all duration-300 font-medium liquid-button ${spendingPeriod === 'yearly'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                      }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategory.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {spendingByCategory.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--text-primary)"
                        fontSize="18"
                        fontWeight="bold"
                      >
                        {formatCurrency(spendingByCategory.total)}
                      </text>
                      <text
                        x="50%"
                        y="50%"
                        dy="20"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--text-secondary)"
                        fontSize="12"
                      >
                        Total Spent
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 ml-8">
                  {spendingByCategory.categories.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm">No expenses yet. Add some expenses to see your spending breakdown.</p>
                  ) : (
                    spendingByCategory.categories.map((item, index) => (
                      <div key={item.name} className="mb-3 p-2 rounded-lg hover:bg-[var(--card-hover)] transition-all duration-300 animate-slide-in-right" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="flex items-center mb-1">
                          <div
                            className="w-3 h-3 rounded-full mr-2 shadow-lg flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-[var(--text-primary)] text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="ml-5 flex items-center justify-between">
                          <div className="text-[var(--text-primary)] font-semibold text-sm">{formatCurrency(item.value)}</div>
                          <div className="text-[var(--text-tertiary)] text-xs">({item.percentage}%)</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights - Row 2-3, Column 3 (Spans 2 Rows) */}
          {aiInsights.length > 0 && (
            <div className="lg:col-span-4 lg:row-span-2">
              <div className="glass-card rounded-2xl p-6 flex flex-col h-full animate-slide-in-up" style={{ animationDelay: '500ms' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">AI Insights</h3>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={prevPage}
                      disabled={insightsPage === 0}
                      className="p-1.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Previous insights"
                    >
                      <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {insightsPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={insightsPage >= totalPages - 1}
                      className="p-1.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next insights"
                    >
                      <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-hidden">
                {paginatedInsights.map((insight, index) => {
                  const getInsightStyle = () => {
                    switch (insight.type) {
                      case 'error':
                        return {
                          bgColor: 'bg-red-500/5',
                          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                          iconBg: 'bg-red-500/10',
                          buttonColor: 'bg-red-500/10 hover:bg-red-500/20 text-red-600'
                        };
                      case 'warning':
                        return {
                          bgColor: 'bg-amber-500/5',
                          icon: <Info className="h-5 w-5 text-amber-500" />,
                          iconBg: 'bg-amber-500/10',
                          buttonColor: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600'
                        };
                      case 'success':
                        return {
                          bgColor: 'bg-green-500/5',
                          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                          iconBg: 'bg-green-500/10',
                          buttonColor: 'bg-green-500/10 hover:bg-green-500/20 text-green-600'
                        };
                      case 'info':
                        return {
                          bgColor: 'bg-blue-500/5',
                          icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
                          iconBg: 'bg-blue-500/10',
                          buttonColor: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600'
                        };
                    }
                  };

                  const style = getInsightStyle();

                  return (
                    <div
                      key={insight.id}
                      className={`${style.bgColor} rounded-xl p-3.5 hover:scale-[1.01] transition-all duration-300 animate-slide-in-right border border-[var(--card-border)] flex-shrink-0`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start">
                        <div className={`${style.iconBg} p-2 rounded-lg mr-3 flex-shrink-0`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[var(--text-primary)] font-semibold mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-[var(--text-secondary)] text-sm mb-3">
                            {insight.description}
                          </p>
                          {insight.action && (
                            <Link
                              href={insight.action.link}
                              className={`${style.buttonColor} px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center transition-all duration-300`}
                            >
                              {insight.action.text}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

          {/* Cashflow Chart - Row 3, Columns 1-2 */}
          <div className="lg:col-span-8">
            <div className="glass-card rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '600ms' }}>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Cashflow (Income vs. Expenses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowData}>
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
            </div>
          </div>
        </div>

        {/* Row 4: Bottom 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Savings Rate Gauge */}
        <div className="glass-card rounded-2xl p-6 animate-scale-in" style={{ animationDelay: '700ms' }}>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Savings Rate</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 192 192"
              >
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="var(--card-border)"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke={savingsRate >= 50 ? 'var(--accent-success)' : savingsRate >= 20 ? 'var(--accent-warning)' : 'var(--accent-error)'}
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(savingsRate / 100) * 502.4} 502.4`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                {/* Centered text inside gauge */}
                <text
                  x="96"
                  y="90"
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="32"
                  fontWeight="700"
                  transform="rotate(90, 96, 96)"
                >
                  {savingsRate}%
                </text>
                <text
                  x="96"
                  y="112"
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="12"
                  transform="rotate(90, 96, 96)"
                >
                  of income
                </text>
              </svg>
            </div>
            <p className="text-[var(--text-secondary)] text-xs mt-4 text-center">
              Monthly savings rate = (Income – Expenses) / Income
            </p>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="glass-card rounded-2xl p-6 animate-scale-in" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Subscriptions</h3>
            <Link
              href="/expenses"
              className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm transition-colors font-medium"
            >
              Manage
            </Link>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">No subscriptions yet</p>
              <Link
                href="/expenses"
                className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm mt-2 inline-block font-medium"
              >
                Add your first subscription
              </Link>
            </div>
          ) : (
            <div className="space-y-2 overflow-hidden">
              {subscriptions
                .filter(sub => sub.is_active)
                .slice(0, 5)
                .map((sub, index) => {
                  const daysUntilBilling = Math.ceil(
                    (new Date(sub.next_billing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isUpcoming = daysUntilBilling <= 7 && daysUntilBilling >= 0;

                  return (
                    <div
                      key={sub.id}
                      className={`p-3 rounded-xl transition-all duration-300 hover:scale-102 animate-slide-in-right ${isUpcoming
                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-[var(--accent-warning)]'
                        : 'bg-[var(--card-bg)] border border-[var(--card-border)]'
                        }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] font-medium text-sm truncate">{sub.name}</p>
                          <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                            {getCurrencyFormatter(sub.currency)(sub.amount)} / {sub.billing_cycle}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          {isUpcoming ? (
                            <span className="text-[var(--accent-warning)] text-xs font-semibold px-2 py-1 rounded-lg bg-[var(--accent-warning)]/10">
                              {daysUntilBilling === 0 ? 'Today' : `${daysUntilBilling}d`}
                            </span>
                          ) : (
                            <span className="text-[var(--text-tertiary)] text-xs">
                              {new Date(sub.next_billing_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {subscriptions.filter(sub => sub.is_active).length > 5 && (
                <Link
                  href="/expenses"
                  className="block text-center text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm py-2 font-medium"
                >
                  View all ({subscriptions.filter(sub => sub.is_active).length})
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Net Worth Trend */}
        <div className="glass-card rounded-2xl p-6 animate-scale-in" style={{ animationDelay: '900ms' }}>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Net Worth Trend (12 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthTrend}>
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}