'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet as WalletIcon, CreditCard, Sparkles, AlertTriangle, CheckCircle, Info, Lightbulb, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { supabase } from '@/lib/supabase';
import { useMemo, useState, useEffect, useRef } from 'react';
import { getCurrencyFormatter } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import { getWallets, calculateWalletBalance, Wallet } from '@/lib/wallets';
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

// Budget interface moved to useFinance context

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
  const { expenses, budgets } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [spendingPeriod, setSpendingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expenses'>('all');
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatRecord[]>([]);
  // Budgets comes from useFinance now
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wallets, setWallets] = useState<(Wallet & { balance: number })[]>([]);
  const [insightsPage, setInsightsPage] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    if (isLoadingRef.current) return;

    let mounted = true;
    isLoadingRef.current = true;

    const loadData = async () => {
      try {
        // Fetch all data concurrently using Promise.all
        const [
          settingsResult,
          incomeResult,
          assetsResult,
          holdingsResult,
          statsResult,
          goalsResult
        ] = await Promise.all([
          supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('income')
            .select('*')
            .order('date', { ascending: false }),
          supabase
            .from('assets')
            .select('*'),
          supabase
            .from('holdings')
            .select('*'),
          supabase
            .from('monthly_stats')
            .select('*')
            .eq('user_id', user.id)
            .order('month', { ascending: true }),
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
        ]);

        // Batch all state updates together (React will batch these automatically in React 18)
        if (mounted) {
          if (settingsResult.data) setUserSettings(settingsResult.data);
          if (!incomeResult.error) setIncome(incomeResult.data || []);
          if (!assetsResult.error) setAssets(assetsResult.data || []);
          if (!holdingsResult.error) setHoldings(holdingsResult.data || []);
          if (!statsResult.error) setMonthlyStats(statsResult.data || []);
          if (!goalsResult.error) setGoals(goalsResult.data || []);

          // Fetch wallets with their balances
          try {
            const profileCurrency = settingsResult.data?.currency || 'USD';
            const walletsData = await getWallets(user.id);
            const walletsWithBalances = await Promise.all(
              walletsData.map(async (wallet) => {
                const { balance } = await calculateWalletBalance(wallet.id, profileCurrency);
                return { ...wallet, balance };
              })
            );
            setWallets(walletsWithBalances);
          } catch (walletError) {
            console.error('Error loading wallets:', walletError);
          }

          setIsDataLoaded(true);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (mounted) setIsDataLoaded(true);
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

    // Balance = monthly income - expenses for the selected month
    const monthlyBalance = totalIncome - totalExpenses;

    // Calculate percentage changes from previous month
    const incomeChange = previousMonthData.income > 0
      ? ((totalIncome - previousMonthData.income) / previousMonthData.income) * 100
      : 0;

    const expenseChange = previousMonthData.expenses > 0
      ? ((totalExpenses - previousMonthData.expenses) / previousMonthData.expenses) * 100
      : 0;

    // Calculate previous month's balance for change calculation
    const prevMonthBalance = previousMonthData.income - previousMonthData.expenses;

    // Calculate balance change
    const balanceChange = prevMonthBalance !== 0
      ? ((monthlyBalance - prevMonthBalance) / Math.abs(prevMonthBalance)) * 100
      : 0;

    return {
      income: { amount: totalIncome, change: incomeChange },
      expenses: { amount: totalExpenses, change: expenseChange },
      balance: { amount: monthlyBalance, change: balanceChange }
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

    // Parse selected month to use as end point
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    const endDate = new Date(selectedYear, selectedMonthNum - 1, 1); // selectedMonth is 1-indexed

    for (let i = 11; i >= 0; i--) {
      const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      // Show year only on January for context
      const isJanuary = date.getMonth() === 0;
      const monthLabel = isJanuary
        ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short' });

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
        expenses: Math.round(monthExpenses * 100) / 100,
        balance: Math.round((monthIncome - monthExpenses) * 100) / 100
      });
    }

    return data;
  }, [expenses, income, userSettings, selectedMonth]);

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

      // Skip goal if name is missing
      if (!goal.title) return;

      if (progress >= 80 && monthsRemaining > 0) {
        insights.push({
          id: `goal-almost-reached-${goal.id}`,
          type: 'success',
          title: `Almost Reached: ${goal.title}`,
          description: `You're at ${progress.toFixed(0)}% of your ${getCurrencyFormatter(goalCurrency)(goal.target_amount)} goal. Just ${getCurrencyFormatter(goalCurrency)(goal.target_amount - currentAmount)} more to go!`,
          action: { text: 'View goals →', link: '/goals' }
        });
      } else if (monthsRemaining > 0 && progress > 0) {
        const monthlyRequired = (goal.target_amount - currentAmount) / monthsRemaining;
        const currentMonthlySavings = financialStats.income.amount - financialStats.expenses.amount;

        if (currentMonthlySavings >= monthlyRequired) {
          const excessAmount = currentMonthlySavings * monthsRemaining - (goal.target_amount - currentAmount);
          insights.push({
            id: `goal-on-track-${goal.id}`,
            type: 'success',
            title: `On Track for ${goal.title}`,
            description: `At your current savings rate of ${getCurrencyFormatter(goalCurrency)(currentMonthlySavings)}/month, you'll reach your ${getCurrencyFormatter(goalCurrency)(goal.target_amount)} goal with ${getCurrencyFormatter(goalCurrency)(excessAmount)} extra to spare!`,
            action: { text: 'View goals →', link: '/goals' }
          });
        }
      }
    });

    // If no insights, add a welcome/getting started insight for new users
    if (insights.length === 0) {
      const hasData = income.length > 0 || expenses.length > 0 || budgets.length > 0 || goals.length > 0;

      if (!hasData) {
        insights.push({
          id: 'welcome-new-user',
          type: 'info',
          title: 'Welcome to WalletAI! 🎉',
          description: 'Start by adding your income, expenses, or setting a budget. AI insights will appear here as you track your finances.',
          action: { text: 'Add your first income →', link: '/income' }
        });
      } else {
        insights.push({
          id: 'no-alerts',
          type: 'success',
          title: 'All Good!',
          description: 'Your finances are on track this month. No alerts or concerns detected.',
        });
      }
    }

    // Sort insights by priority: error > warning > info > success
    const priorityOrder = { error: 0, warning: 1, info: 2, success: 3 };
    insights.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);


    return insights;
  }, [budgets, goals, monthExpenses, expenses, financialStats, previousMonthData, selectedMonth, userSettings, formatCurrency, assets, holdings]);

  // Paginate insights - show 4 per page
  const paginatedInsights = useMemo(() => {
    const INSIGHTS_PER_PAGE = 4;
    const start = insightsPage * INSIGHTS_PER_PAGE;
    return aiInsights.slice(start, start + INSIGHTS_PER_PAGE);
  }, [aiInsights, insightsPage]);

  const totalPages = Math.ceil(aiInsights.length / 4);

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

  // Balance trend - shows monthly balance (income - expenses) for last 12 months
  const balanceTrend = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const data = [];

    // Parse selected month to use as end point
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    const endDate = new Date(selectedYear, selectedMonthNum - 1, 1); // selectedMonth is 1-indexed

    for (let i = 11; i >= 0; i--) {
      const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      // Show year only on January for context
      const isJanuary = date.getMonth() === 0;
      const monthLabel = isJanuary
        ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Calculate income for this month
      const monthIncome = income
        .filter(inc => {
          const incDate = new Date(inc.date);
          return `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
        })
        .reduce((sum, inc) => sum + convertCurrency(inc.amount, (inc as IncomeRecord).currency || 'USD', profileCurrency), 0);

      // Calculate expenses for this month
      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
        })
        .reduce((sum, exp) => sum + convertCurrency(exp.amount, (exp as { currency?: string }).currency || 'USD', profileCurrency), 0);

      // Balance = income - expenses
      const balance = monthIncome - monthExpenses;

      data.push({
        month: monthLabel,
        value: Math.round(balance * 100) / 100
      });
    }

    return data;
  }, [income, expenses, userSettings, selectedMonth]);

  // Net Worth by type for pie chart (includes assets + investments)
  const netWorthByType = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const typeTotals: Record<string, number> = {};

    // Add assets
    assets.forEach(asset => {
      const type = (asset as { type?: string }).type || 'Other';
      const displayName = type.charAt(0).toUpperCase() + type.slice(1);
      const amountInProfileCurrency = convertCurrency(
        asset.amount,
        asset.currency || 'USD',
        profileCurrency
      );
      typeTotals[displayName] = (typeTotals[displayName] || 0) + amountInProfileCurrency;
    });

    // Add investments as a category
    const investmentTotal = holdings.reduce((sum, holding) => {
      const currentPrice = holding.current_price || holding.average_price || 0;
      const valueInHoldingCurrency = holding.shares * currentPrice;
      const valueInProfileCurrency = convertCurrency(
        valueInHoldingCurrency,
        holding.currency || 'USD',
        profileCurrency
      );
      return sum + valueInProfileCurrency;
    }, 0);

    if (investmentTotal > 0) {
      typeTotals['Investments'] = investmentTotal;
    }

    // Add wallets (income/expense balance)
    const walletTotal = wallets.reduce((sum, wallet) => {
      return sum + (wallet.balance || 0);
    }, 0);

    if (walletTotal !== 0 && wallets.length > 0) {
      typeTotals['Wallets'] = walletTotal;
    }

    const total = Object.values(typeTotals).reduce((sum, val) => sum + val, 0);
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4'];

    return {
      total,
      types: Object.entries(typeTotals)
        .map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length],
          percentage: total > 0 && value > 0 ? Math.max(1, Math.round((value / total) * 100)) : 0
        }))
        .sort((a, b) => b.value - a.value)
    };
  }, [assets, holdings, wallets, userSettings]);

  // Recent transactions (combined income and expenses) - filtered by selected month
  const recentTransactions = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);

    // Filter and map expenses for the selected month
    const expensesList = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === selectedYear && expDate.getMonth() + 1 === selectedMonthNum;
      })
      .map(exp => ({
        id: exp.id,
        type: 'expense' as const,
        description: exp.description,
        amount: -convertCurrency(exp.amount, (exp as { currency?: string }).currency || 'USD', profileCurrency),
        category: exp.category,
        date: new Date(exp.date),
        dateStr: new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));

    // Filter and map income for the selected month
    const incomeList = income
      .filter(inc => {
        const incDate = new Date(inc.date);
        return incDate.getFullYear() === selectedYear && incDate.getMonth() + 1 === selectedMonthNum;
      })
      .map(inc => ({
        id: (inc as { id?: string }).id || String(Math.random()),
        type: 'income' as const,
        description: (inc as { description?: string }).description || (inc as { source?: string }).source || 'Income',
        amount: convertCurrency(inc.amount, inc.currency || 'USD', profileCurrency),
        category: (inc as { source?: string }).source || 'Income',
        date: new Date(inc.date),
        dateStr: new Date(inc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));

    // Combine and sort by date
    const allTransactions = [...expensesList, ...incomeList]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10); // Get top 10 for filtering

    return allTransactions;
  }, [expenses, income, userSettings, selectedMonth]);

  // Filtered transactions based on dropdown
  const filteredTransactions = useMemo(() => {
    let filtered = recentTransactions;
    if (transactionFilter === 'income') {
      filtered = recentTransactions.filter(tx => tx.type === 'income');
    } else if (transactionFilter === 'expenses') {
      filtered = recentTransactions.filter(tx => tx.type === 'expense');
    }
    return filtered.slice(0, 5);
  }, [recentTransactions, transactionFilter]);



  return (
    <div className="p-4 md:p-6 min-h-screen bg-[var(--background)] transition-colors duration-300">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-up">
        <div className="pl-16 lg:pl-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}</p>
        </div>

        {/* Month Selector */}
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>

      {/* Main Layout */}
      <div className="mb-6 md:mb-8">
        {/* Row 1: Summary Cards (Full Width) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          <Link href="/income" className="glass-card rounded-2xl p-6 cursor-pointer group animate-scale-in h-[160px] flex flex-col justify-between shadow-lg shadow-green-500/10 border border-green-500/20 hover:shadow-green-500/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-secondary)] text-lg font-semibold">Income</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {!isDataLoaded ? (
                    <span className="text-[var(--text-tertiary)] text-xl">Calculating...</span>
                  ) : (
                    formatCurrency(financialStats.income.amount)
                  )}
                </p>
                {isDataLoaded && (
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
                    <span className="text-[var(--text-secondary)] text-xs ml-1">vs prev month ({formatCurrency(previousMonthData.income)})</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link href="/expenses" className="glass-card rounded-2xl p-6 cursor-pointer group animate-scale-in h-[160px] flex flex-col justify-between shadow-lg shadow-red-500/10 border border-red-500/20 hover:shadow-red-500/20 transition-all duration-300" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-secondary)] text-lg font-semibold">Expenses</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {!isDataLoaded ? (
                    <span className="text-[var(--text-tertiary)] text-xl">Calculating...</span>
                  ) : (
                    formatCurrency(financialStats.expenses.amount)
                  )}
                </p>
                {isDataLoaded && (
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
                    <span className="text-[var(--text-secondary)] text-xs ml-1">vs prev month ({formatCurrency(previousMonthData.expenses)})</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          <Link href="/assets" className="glass-card rounded-2xl p-6 cursor-pointer group animate-scale-in h-[160px] flex flex-col justify-between shadow-lg shadow-blue-500/10 border border-blue-500/20 hover:shadow-blue-500/20 transition-all duration-300" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-secondary)] text-lg font-semibold">Balance</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <WalletIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {!isDataLoaded ? (
                    <span className="text-[var(--text-tertiary)] text-xl">Calculating...</span>
                  ) : (
                    formatCurrency(financialStats.balance.amount)
                  )}
                </p>
                {isDataLoaded && (
                  <div className="flex items-center mt-2 mb-2">
                    {financialStats.balance.change >= 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-[var(--accent-success)] mr-1" />
                        <span className="text-[var(--accent-success)] text-sm font-medium">+{financialStats.balance.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-[var(--accent-error)] mr-1" />
                        <span className="text-[var(--accent-error)] text-sm font-medium">{financialStats.balance.change.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-[var(--text-secondary)] text-xs ml-1">vs prev month ({formatCurrency(previousMonthData.income - previousMonthData.expenses)})</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Row 2: Cashflow + AI Insights (spans 2 rows) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Cashflow Line Chart - 8 columns - Responsive height */}
          <div className="lg:col-span-8" style={{ minHeight: 'clamp(280px, 25vw, 350px)' }}>
            <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-in-up h-full flex flex-col" style={{ animationDelay: '300ms' }}>
              <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-6 flex-shrink-0">Cashflow</h3>
              <div className="flex-1 min-h-0 pr-4" role="img" aria-label="Line chart showing income and expenses over the last 12 months">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      stroke="var(--text-secondary)"
                      style={{ fontSize: '12px', fontWeight: 300 }}
                      axisLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      style={{ fontSize: '12px', fontWeight: 300 }}
                      axisLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                      tickLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                      width={70}
                      tickFormatter={(value) => {
                        const currency = userSettings?.currency || 'USD';
                        const symbol = currency === 'SGD' ? 'S$' : currency === 'MYR' ? 'RM' : '$';
                        if (value >= 1000) {
                          return `${symbol}${(value / 1000).toFixed(0)}K`;
                        }
                        return `${symbol}${value}`;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#incomeGradient)"
                      name="Income"
                      dot={false}
                      activeDot={{ r: 5, fill: '#10B981', stroke: 'white', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      fill="url(#expenseGradient)"
                      name="Expenses"
                      dot={false}
                      activeDot={{ r: 5, fill: '#EF4444', stroke: 'white', strokeWidth: 1 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-auto pt-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span className="text-sm text-[var(--text-secondary)]">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <span className="text-sm text-[var(--text-secondary)]">Expenses</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights - 4 columns, spans 2 rows - Responsive height */}
          {aiInsights.length > 0 && (
            <div className="lg:col-span-4 lg:row-span-2" style={{ minHeight: 'clamp(500px, 50vw, 730px)' }}>
              <div className="glass-card rounded-2xl p-4 md:p-6 flex flex-col h-full animate-slide-in-up" style={{ animationDelay: '350ms' }}>
                <div className="flex items-center justify-between mb-4">
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

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {paginatedInsights.map((insight, index) => {
                    const getInsightStyle = () => {
                      switch (insight.type) {
                        case 'error':
                          return {
                            bgColor: 'bg-red-500/15',
                            borderColor: 'border-red-500/40',
                            icon: <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />,
                            iconBg: 'bg-red-500/20',
                            buttonColor: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                          };
                        case 'warning':
                          return {
                            bgColor: 'bg-amber-500/10',
                            borderColor: 'border-amber-500/30',
                            icon: <Info className="h-5 w-5 text-amber-500" />,
                            iconBg: 'bg-amber-500/15',
                            buttonColor: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                          };
                        case 'success':
                          return {
                            bgColor: 'bg-green-500/10',
                            borderColor: 'border-green-500/20',
                            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                            iconBg: 'bg-green-500/10',
                            buttonColor: 'bg-green-500/20 hover:bg-green-500/30 text-green-600'
                          };
                        case 'info':
                          return {
                            bgColor: 'bg-blue-500/5',
                            borderColor: 'border-blue-500/20',
                            icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
                            iconBg: 'bg-blue-500/10',
                            buttonColor: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-600'
                          };
                      }
                    };

                    const style = getInsightStyle();

                    return (
                      <div
                        key={insight.id}
                        className={`${style.bgColor} rounded-xl p-3.5 transition-all duration-300 animate-slide-in-right border ${style.borderColor || 'border-[var(--card-border)]'} flex-shrink-0`}
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

          {/* Row 3: Net Worth + Top Expenses - Responsive height */}
          {/* Net Worth Pie Chart */}
          <div className="lg:col-span-4" style={{ minHeight: 'clamp(280px, 25vw, 350px)', containerType: 'inline-size' }}>
            <Link href="/assets" className="glass-card rounded-2xl p-4 md:p-6 animate-slide-in-up h-full flex flex-col cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Net Worth</h3>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <WalletIcon className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="flex-1 flex items-center">
                <div className="flex flex-col xl:flex-row items-center xl:items-start gap-4 xl:gap-8 px-1 w-full">
                  {/* Pie Chart on Left with value below */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-24 h-24 xl:w-28 xl:h-28" role="img" aria-label="Pie chart showing net worth by type">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={netWorthByType.types}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={45}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {netWorthByType.types.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Value below pie chart - removed 'Total' text */}
                    <div className="text-center mt-2">
                      <span className="text-base font-bold text-[var(--text-primary)] block">{formatCurrency(netWorthByType.total)}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 xl:space-y-4 w-full">
                    {netWorthByType.types.map((type) => (
                      <div key={type.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                          <span className="text-sm text-[var(--text-primary)] font-medium">{type.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="net-worth-amount text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(type.value)}</span>
                          <span className="net-worth-pct-with-parens text-xs text-[var(--text-secondary)] ml-1">({type.percentage}%)</span>
                          <span className="net-worth-pct-no-parens text-xs text-[var(--text-secondary)]">{type.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Top Expenses - Horizontal Bar Chart - Responsive height */}
          <div className="lg:col-span-4" style={{ minHeight: 'clamp(280px, 25vw, 350px)' }}>
            <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-in-up h-full flex flex-col" style={{ animationDelay: '450ms' }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-0 mb-4 flex-shrink-0">
                <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">
                  Top Expenses
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSpendingPeriod('monthly')}
                    className={`px-3 py-1.5 text-sm rounded-xl transition-all duration-300 font-medium ${spendingPeriod === 'monthly'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                      }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSpendingPeriod('yearly')}
                    className={`px-3 py-1.5 text-sm rounded-xl transition-all duration-300 font-medium ${spendingPeriod === 'yearly'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                      }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="space-y-8 px-2">
                  {spendingByCategory.categories.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm text-center py-8">No expenses yet</p>
                  ) : (
                    spendingByCategory.categories.slice(0, 3).map((item, index) => (
                      <div key={item.name} className="animate-slide-in-right" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-[var(--text-primary)] font-medium">{item.name}</span>
                          </div>
                          <span className="text-sm text-[var(--text-primary)] font-semibold">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {spendingByCategory.total > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--card-border)] px-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Total</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(spendingByCategory.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Recent Transactions + Balance Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Recent Transactions - Spans 8 columns - Responsive height */}
          <div className="lg:col-span-8 glass-card rounded-2xl p-4 md:p-6 animate-scale-in flex flex-col" style={{ animationDelay: '500ms', minHeight: 'clamp(350px, 30vw, 450px)' }}>
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Recent Transactions</h3>
              <select
                value={transactionFilter}
                onChange={(e) => setTransactionFilter(e.target.value as 'all' | 'income' | 'expenses')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expenses">Expenses</option>
              </select>
            </div>

            <div className="px-2 overflow-y-auto flex-1">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)] text-sm">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((tx, index) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--card-hover)] transition-all duration-300 animate-slide-in-right"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === 'income'
                          ? 'bg-green-500/15'
                          : 'bg-red-500/15'
                          }`}>
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[150px] sm:max-w-[300px]">
                            {tx.description}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">{tx.category} • {tx.dateStr}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-error)]'
                        }`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Balance Trend - Same height as transactions tile - Responsive */}
          <div className="lg:col-span-4 glass-card rounded-2xl p-4 md:p-6 animate-scale-in flex flex-col" style={{ animationDelay: '550ms', minHeight: 'clamp(350px, 30vw, 450px)' }}>
            <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-6 flex-shrink-0">Balance</h3>
            <div className="flex-1 min-h-0 p-2 pr-4" role="img" aria-label="Line chart showing monthly balance (income minus expenses) over the last 12 months">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px', fontWeight: 300 }}
                    axisLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px', fontWeight: 300 }}
                    axisLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                    tickLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                    width={60}
                    tickFormatter={(value) => {
                      const currency = userSettings?.currency || 'USD';
                      const symbol = currency === 'SGD' ? 'S$' : currency === 'MYR' ? 'RM' : '$';
                      if (value >= 1000) {
                        return `${symbol}${(value / 1000).toFixed(0)}K`;
                      }
                      return `${symbol}${value}`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
