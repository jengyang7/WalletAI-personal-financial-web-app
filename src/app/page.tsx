'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { Target, TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, Calendar } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { supabase } from '@/lib/supabase';
import { useMemo, useState, useEffect } from 'react';
import { getCurrencyFormatter } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';
import Link from 'next/link';

const financialData = {
  income: { amount: 5500, change: 10 },
  expenses: { amount: 3200, change: -5 },
  savings: { amount: 2300, change: 15 }
};

const spendingData = [
  { name: 'Groceries', value: 1280, color: '#3B82F6', percentage: 40 },
  { name: 'Transportation', value: 640, color: '#10B981', percentage: 20 },
  { name: 'Housing', value: 960, color: '#F59E0B', percentage: 30 },
  { name: 'Entertainment', value: 320, color: '#8B5CF6', percentage: 10 }
];

const recentExpenses = [
  { date: '2024-07-15', description: 'Grocery Shopping', category: 'Groceries', amount: -150.00 },
  { date: '2024-07-14', description: 'Salary Deposit', category: 'Income', amount: 5500.00 },
  { date: '2024-07-12', description: 'Dinner Out', category: 'Entertainment', amount: -80.00 },
  { date: '2024-07-10', description: 'Gas Station', category: 'Transportation', amount: -40.00 },
  { date: '2024-07-08', description: 'Rent Payment', category: 'Housing', amount: -960.00 }
];

export default function Dashboard() {
  const { expenses, subscriptions } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [userSettings, setUserSettings] = useState<any>(null);
  const [income, setIncome] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [spendingPeriod, setSpendingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (user) {
      loadUserSettings();
      loadIncome();
      loadAssets();
    }
  }, [user]);

  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setUserSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadIncome = async () => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setIncome(data || []);
    } catch (error) {
      console.error('Error loading income:', error);
    }
  };

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

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

    return {
      expenses: prevExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      income: prevIncome.reduce((sum, inc) => sum + inc.amount, 0)
    };
  }, [expenses, income, selectedMonth]);

  // Calculate real financial data for selected month with comparisons
  const financialStats = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    
    const totalExpenses = monthExpenses.reduce((sum, exp) => {
      const amountInProfileCurrency = convertCurrency(
        exp.amount,
        (exp as any).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);
    
    const totalIncome = monthIncome.reduce((sum, inc) => {
      const amountInProfileCurrency = convertCurrency(
        inc.amount,
        (inc as any).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);
    
    const totalAssets = assets.reduce((sum, asset) => {
      const amountInProfileCurrency = convertCurrency(
        asset.amount,
        (asset as any).currency || 'USD',
        profileCurrency
      );
      return sum + amountInProfileCurrency;
    }, 0);

    // Calculate percentage changes from previous month
    const incomeChange = previousMonthData.income > 0
      ? ((totalIncome - previousMonthData.income) / previousMonthData.income) * 100
      : 0;

    const expenseChange = previousMonthData.expenses > 0
      ? ((totalExpenses - previousMonthData.expenses) / previousMonthData.expenses) * 100
      : 0;

    // Calculate net worth change (placeholder - can be enhanced with historical data)
    const netWorthChange = (incomeChange - expenseChange) / 2;
    
    return {
      income: { amount: totalIncome, change: incomeChange },
      expenses: { amount: totalExpenses, change: expenseChange },
      netWorth: { amount: totalAssets, change: netWorthChange }
    };
  }, [monthExpenses, monthIncome, assets, previousMonthData, userSettings]);

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
        (exp as any).currency || 'USD', 
        profileCurrency
      );
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + expenseInProfileCurrency;
    });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
    
    return {
      total,
      categories: Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }))
    };
  }, [monthExpenses, expenses, selectedMonth, spendingPeriod, userSettings]);

  // Get recent expenses for selected month (last 5)
  const recentExpensesList = useMemo(() => {
    return monthExpenses.slice(0, 5).map(exp => ({
      date: new Date(exp.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      description: exp.description,
      category: exp.category,
      amount: -exp.amount,
      currency: (exp as any).currency || 'USD' // Include currency from expense
    }));
  }, [monthExpenses]);

  // Calculate monthly spending for last 12 months
  const monthlySpendingData = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const data = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthTotal = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getFullYear() === date.getFullYear() && expDate.getMonth() === date.getMonth();
        })
        .reduce((sum, exp) => {
          const amountInProfileCurrency = convertCurrency(
            exp.amount,
            (exp as any).currency || 'USD',
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
            (exp as any).currency || 'USD',
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
            (inc as any).currency || 'USD',
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
        (exp as any).currency || 'USD',
        userSettings?.currency || 'USD'
      );
      return sum + amountInProfileCurrency;
    }, 0);
    
    const totalIncome = monthIncome.reduce((sum, inc) => {
      const amountInProfileCurrency = convertCurrency(
        inc.amount,
        (inc as any).currency || 'USD',
        userSettings?.currency || 'USD'
      );
      return sum + amountInProfileCurrency;
    }, 0);
    
    if (totalIncome === 0) return 0;
    return Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
  }, [monthExpenses, monthIncome, userSettings]);

  // Calculate net worth trend for last 12 months
  const netWorthTrend = useMemo(() => {
    const data = [];
    const now = new Date();
    const currentNetWorth = assets.reduce((sum, asset) => {
      const valueInProfileCurrency = convertCurrency(
        asset.amount,
        (asset as any).currency || 'USD',
        userSettings?.currency || 'USD'
      );
      return sum + valueInProfileCurrency;
    }, 0);
    
    // Simulate historical net worth (in a real app, this would come from historical data)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Simulate growth from 80% to 100% of current net worth
      const growthFactor = 0.80 + (i * 0.018);
      const monthValue = currentNetWorth * growthFactor;
      
      data.push({
        month: monthLabel,
        value: Math.round(monthValue * 100) / 100
      });
    }
    
    return data;
  }, [assets, userSettings]);

  return (
    <div className="p-6 bg-slate-800 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}</p>
        </div>
        
        {/* Month Selector */}
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/income" className="bg-slate-900 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Income</h3>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(financialStats.income.amount)}</p>
              <div className="flex items-center mt-2">
                {financialStats.income.change >= 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">+{financialStats.income.change.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
                    <span className="text-red-400 text-sm">{financialStats.income.change.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-slate-500 text-xs ml-1">vs prev month</span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/expenses" className="bg-slate-900 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Expenses</h3>
            <CreditCard className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(financialStats.expenses.amount)}</p>
              <div className="flex items-center mt-2">
                {financialStats.expenses.change >= 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-400 mr-1" />
                    <span className="text-red-400 text-sm">+{financialStats.expenses.change.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">{financialStats.expenses.change.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-slate-500 text-xs ml-1">vs prev month</span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/assets" className="bg-slate-900 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Net Worth</h3>
            <Wallet className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(financialStats.netWorth.amount)}</p>
              <div className="flex items-center mt-2">
                {financialStats.netWorth.change >= 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">+{financialStats.netWorth.change.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
                    <span className="text-red-400 text-sm">{financialStats.netWorth.change.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-slate-500 text-xs ml-1">vs prev month</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Section - Monthly Spending & Spending by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Spending Chart */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Monthly Spending (Last 12 Months)</h3>
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

        {/* Spending by Category */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Spending by Category</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setSpendingPeriod('monthly')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  spendingPeriod === 'monthly' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setSpendingPeriod('yearly')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  spendingPeriod === 'yearly' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
                  >
                    {spendingByCategory.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="18" fontWeight="bold">
                    {formatCurrency(spendingByCategory.total)}
                  </text>
                  <text x="50%" y="50%" dy="20" textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize="12">
                    Total Spent
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 ml-8">
              {spendingByCategory.categories.length === 0 ? (
                <p className="text-slate-400 text-sm">No expenses yet. Add some expenses to see your spending breakdown.</p>
              ) : (
                spendingByCategory.categories.map((item) => (
                <div key={item.name} className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-white text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{formatCurrency(item.value)}</div>
                    <div className="text-slate-400 text-xs">({item.percentage}%)</div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cashflow Chart (Income vs Expenses) */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">Cashflow (Income vs. Expenses)</h3>
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
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings Rate Gauge, Subscriptions, and Net Worth Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Savings Rate Gauge */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Savings Rate</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#334155"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke={savingsRate >= 50 ? '#10B981' : savingsRate >= 20 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(savingsRate / 100) * 502.4} 502.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{savingsRate}%</span>
                <span className="text-slate-400 text-sm mt-1">of income</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-4 text-center">
              Monthly savings rate = (Income – Expenses) / Income
            </p>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Subscriptions</h3>
            <Link 
              href="/expenses"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Manage
            </Link>
          </div>
          
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No subscriptions yet</p>
              <Link 
                href="/expenses"
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
              >
                Add your first subscription
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {subscriptions
                .filter(sub => sub.is_active)
                .slice(0, 8)
                .map((sub) => {
                  const daysUntilBilling = Math.ceil(
                    (new Date(sub.next_billing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isUpcoming = daysUntilBilling <= 7 && daysUntilBilling >= 0;
                  
                  return (
                    <div
                      key={sub.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isUpcoming 
                          ? 'bg-orange-900/20 border-orange-700' 
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{sub.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {getCurrencyFormatter(sub.currency)(sub.amount)} / {sub.billing_cycle}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          {isUpcoming ? (
                            <span className="text-orange-400 text-xs font-medium">
                              {daysUntilBilling === 0 ? 'Today' : `${daysUntilBilling}d`}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">
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
              {subscriptions.filter(sub => sub.is_active).length > 8 && (
                <Link 
                  href="/expenses"
                  className="block text-center text-blue-400 hover:text-blue-300 text-sm py-2"
                >
                  View all ({subscriptions.filter(sub => sub.is_active).length})
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Net Worth Trend */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Net Worth Trend (12 Months)</h3>
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
                  formatter={(value: any) => [formatCurrency(value), 'Net Worth']}
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
  );
}