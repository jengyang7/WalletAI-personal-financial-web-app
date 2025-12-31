'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, ShoppingCart, Car, Home, Gamepad2, Trash2, CreditCard, Calendar, RefreshCw, X, Sparkles, Zap, Send, Loader2, Check, Wallet } from 'lucide-react';
import { CATEGORY_OPTIONS } from '@/constants/categories';
import { useFinance, type Subscription } from '@/context/FinanceContext';
import { useMonth } from '@/context/MonthContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';
import { autoCategorize } from '@/lib/autoCategorization';
import { Wallet as WalletType, getWallets, ensureDefaultWallet } from '@/lib/wallets';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  currency?: string;
  wallet_id?: string;
}

const categories = CATEGORY_OPTIONS;

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'shopping':
      return ShoppingCart;
    case 'transportation':
      return Car;
    case 'housing':
    case 'utilities':
      return Home;
    case 'entertainment':
      return Gamepad2;
    default:
      return ShoppingCart;
  }
};

export default function Expenses() {
  const { expenses, addExpense, subscriptions, reloadSubscriptions, reloadExpenses } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [userSettings, setUserSettings] = useState<{ currency?: string;[key: string]: unknown } | null>(null);

  // Helper to get date based on selected month with today's day
  const getDateForSelectedMonth = () => {
    const today = new Date();
    const day = today.getDate();
    if (selectedMonth === 'all') {
      return today.toISOString().split('T')[0];
    }
    const [year, month] = selectedMonth.split('-');
    // Ensure day doesn't exceed days in selected month
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const safeDay = Math.min(day, lastDayOfMonth);
    return `${year}-${month}-${String(safeDay).padStart(2, '0')}`;
  };

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Food & Dining',
    currency: 'USD',
    wallet_id: ''
  });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    amount: '',
    currency: 'USD',
    category: 'Entertainment',
    billing_cycle: 'monthly' as 'monthly' | 'yearly',
    next_billing_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [autoCategoryMethod, setAutoCategoryMethod] = useState<'keyword' | 'gemini' | null>(null);
  const autoCategorizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Mode states
  const [isAIMode, setIsAIMode] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<{
    description: string;
    amount: string;
    currency: string;
    date: string;
    category: string;
    method?: 'keyword' | 'gemini' | 'default';
    wallet_id?: string;
  } | null>(null);

  // Wallet state
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Load user currency setting
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setUserSettings(data);
        setNewExpense(prev => ({ ...prev, currency: data.currency || 'USD' }));
        setNewSubscription(prev => ({ ...prev, currency: data.currency || 'USD' }));
      }

      // Load wallets
      if (user) {
        await ensureDefaultWallet(user.id, data?.currency || 'USD');
        const userWallets = await getWallets(user.id);
        setWallets(userWallets);
        const defaultWallet = userWallets.find(w => w.is_default);
        if (defaultWallet) {
          setNewExpense(prev => ({ ...prev, wallet_id: defaultWallet.id }));
        }
      }
    };
    loadSettings();
  }, [user]);

  // Sync form date with selected month
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      setNewExpense(prev => ({ ...prev, date: getDateForSelectedMonth() }));
    }
  }, [selectedMonth]);

  // Auto-apply subscriptions that are due
  useEffect(() => {
    const checkAndApplySubscriptions = async () => {
      if (!user || subscriptions.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const sub of subscriptions) {
        if (!sub.is_active) continue;

        const nextBillingDate = new Date(sub.next_billing_date);
        nextBillingDate.setHours(0, 0, 0, 0);

        // If billing date is today or in the past, auto-apply
        if (nextBillingDate <= today) {
          try {
            // Check if already applied for this month
            const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const { data: existingExpenses } = await supabase
              .from('expenses')
              .select('*')
              .eq('user_id', user.id)
              .ilike('description', `%${sub.name}%Subscription%`);

            const alreadyApplied = existingExpenses?.some(exp => {
              const expDate = new Date(exp.date);
              const expMonthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
              return expMonthKey === monthKey;
            });

            if (!alreadyApplied) {
              // Apply subscription
              await addExpense({
                description: `${sub.name} (Subscription)`,
                amount: sub.amount,
                date: new Date().toISOString().split('T')[0],
                category: sub.category,
                currency: sub.currency
              });

              // Update next billing date
              const nextDate = new Date(sub.next_billing_date);
              if (sub.billing_cycle === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
              } else {
                nextDate.setFullYear(nextDate.getFullYear() + 1);
              }

              await supabase
                .from('subscriptions')
                .update({ next_billing_date: nextDate.toISOString().split('T')[0] })
                .eq('id', sub.id);
            }
          } catch (error) {
            console.error('Error auto-applying subscription:', error);
          }
        }
      }
    };

    checkAndApplySubscriptions();
  }, [subscriptions, user, addExpense]);

  const profileCurrency = userSettings?.currency || 'USD';
  const formatCurrency = getCurrencyFormatter(profileCurrency);
  const currencySymbol = getCurrencySymbol(newExpense.currency || profileCurrency);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);

  // Filter expenses by selected month (or show all)
  const filteredExpenses = useMemo(() => {
    if (selectedMonth === 'all') {
      return expenses;
    }
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const [year, month] = selectedMonth.split('-');
      return expenseDate.getFullYear() === parseInt(year) &&
        expenseDate.getMonth() + 1 === parseInt(month);
    });
  }, [expenses, selectedMonth]);

  // Calculate total expenses for selected month
  const totalExpenses = useMemo(() => {
    // Use selected month if not 'all', otherwise use current month
    const targetMonth = selectedMonth === 'all'
      ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      : selectedMonth;

    return expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        return expMonth === targetMonth;
      })
      .reduce((sum, exp) => {
        const amountInProfileCurrency = convertCurrency(
          exp.amount,
          exp.currency || 'USD',
          profileCurrency
        );
        return sum + amountInProfileCurrency;
      }, 0);
  }, [expenses, userSettings, selectedMonth]);

  // Calculate expenses by category for current month
  const _expensesByCategory = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const categoryTotals: Record<string, number> = {};

    expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        return expMonth === currentMonth;
      })
      .forEach(exp => {
        const amountInProfileCurrency = convertCurrency(
          exp.amount,
          exp.currency || 'USD',
          profileCurrency
        );
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amountInProfileCurrency;
      });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

    return {
      total,
      categories: Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }))
    };
  }, [expenses, userSettings, profileCurrency]);

  // Group expenses by month and day
  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    const date = new Date(expense.date);
    const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (!acc[monthYear]) {
      acc[monthYear] = {};
    }
    if (!acc[monthYear][day]) {
      acc[monthYear][day] = [];
    }
    acc[monthYear][day].push(expense);
    return acc;
  }, {} as Record<string, Record<string, Expense[]>>);

  // Auto-categorization when description changes
  const handleDescriptionChange = useCallback(async (description: string) => {
    setNewExpense(prev => ({ ...prev, description }));

    // Clear previous timeout
    if (autoCategorizeTimeoutRef.current) {
      clearTimeout(autoCategorizeTimeoutRef.current);
    }

    // Don't auto-categorize if description is too short
    if (description.trim().length < 3) {
      setAutoCategoryMethod(null);
      return;
    }

    // Debounce auto-categorization (wait 500ms after user stops typing)
    setIsAutoCategorizing(true);
    autoCategorizeTimeoutRef.current = setTimeout(async () => {
      try {
        const userCurrency = userSettings?.currency || 'USD';
        const result = await autoCategorize(description, userCurrency, true);

        // Build the update object
        const updates: Partial<typeof newExpense> = {
          category: result.category
        };

        // Auto-fill amount if extracted (only if field is empty or auto-filled before)
        if (result.extractedAmount != null) {
          updates.amount = result.extractedAmount.toString();
        }

        // Auto-fill currency if extracted
        if (result.extractedCurrency) {
          updates.currency = result.extractedCurrency;
        }

        // Auto-fill date if extracted
        if (result.extractedDate) {
          updates.date = result.extractedDate;
        }

        // Use cleaned description if available
        if (result.cleanedDescription && result.cleanedDescription.trim()) {
          updates.description = result.cleanedDescription;
        }

        // Apply all updates at once
        setNewExpense(prev => ({ ...prev, ...updates }));
        setAutoCategoryMethod(result.method === 'default' ? null : result.method);

      } catch (error) {
        console.error('Auto-categorization error:', error);
      } finally {
        setIsAutoCategorizing(false);
      }
    }, 500);
  }, [userSettings?.currency]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCategorizeTimeoutRef.current) {
        clearTimeout(autoCategorizeTimeoutRef.current);
      }
    };
  }, []);

  // Handle AI input processing
  const handleAIProcess = async () => {
    if (!aiInput.trim()) return;

    setIsProcessing(true);
    try {
      const userCurrency = userSettings?.currency || 'USD';
      const result = await autoCategorize(aiInput, userCurrency, true);

      // Get default wallet
      const defaultWallet = wallets.find(w => w.is_default);

      // Use extracted date if available, otherwise use selected month with today's day
      const defaultDate = getDateForSelectedMonth();

      // Prepare review data
      setReviewData({
        description: result.cleanedDescription || aiInput,
        amount: result.extractedAmount?.toString() || '',
        currency: result.extractedCurrency || userCurrency,
        date: result.extractedDate || defaultDate,
        category: result.category,
        method: result.method,
        wallet_id: defaultWallet?.id || ''
      });

      setShowReviewModal(true);
    } catch (error) {
      console.error('Error processing AI input:', error);
      alert('Failed to process expense. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle review confirmation
  const handleReviewConfirm = async () => {
    if (!reviewData || !reviewData.amount) return;

    setIsAddingExpense(true);
    try {
      await addExpense({
        description: reviewData.description,
        amount: parseFloat(reviewData.amount),
        date: reviewData.date,
        category: reviewData.category,
        currency: reviewData.currency,
        wallet_id: reviewData.wallet_id || undefined
      });

      // Reset states
      setShowReviewModal(false);
      setReviewData(null);
      setAiInput('');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (newExpense.description && newExpense.amount) {
      setIsAddingExpense(true);
      try {
        await addExpense({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          date: newExpense.date,
          category: newExpense.category,
          currency: newExpense.currency,
          wallet_id: newExpense.wallet_id || undefined
        });

        const defaultWallet = wallets.find(w => w.is_default);
        // Keep form using selected month date
        setNewExpense({
          description: '',
          amount: '',
          date: getDateForSelectedMonth(),
          category: 'Food & Dining',
          currency: userSettings?.currency || 'USD',
          wallet_id: defaultWallet?.id || ''
        });
        setAutoCategoryMethod(null);
      } finally {
        setIsAddingExpense(false);
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setDeletingExpense(expenseId);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // Reload expenses data without full page refresh
      await reloadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    } finally {
      setDeletingExpense(null);
    }
  };

  const handleEditExpense = async (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          description: editingExpense.description,
          amount: editingExpense.amount,
          category: editingExpense.category,
          date: editingExpense.date,
          currency: (editingExpense as Expense & { currency?: string }).currency || 'USD',
          wallet_id: editingExpense.wallet_id || null
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      setEditingExpense(null);
      await reloadExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense');
    }
  };

  // Subscription handlers
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSubscription.name || !newSubscription.amount) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          name: newSubscription.name,
          amount: parseFloat(newSubscription.amount),
          currency: newSubscription.currency,
          category: newSubscription.category,
          billing_cycle: newSubscription.billing_cycle,
          next_billing_date: newSubscription.next_billing_date,
          description: newSubscription.description,
          is_active: true
        });

      if (error) throw error;

      setShowSubscriptionModal(false);
      setNewSubscription({
        name: '',
        amount: '',
        currency: userSettings?.currency || 'USD',
        category: 'Entertainment',
        billing_cycle: 'monthly',
        next_billing_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      await reloadSubscriptions();
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert('Failed to add subscription');
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          name: editingSubscription.name,
          amount: editingSubscription.amount,
          currency: editingSubscription.currency,
          category: editingSubscription.category,
          billing_cycle: editingSubscription.billing_cycle,
          next_billing_date: editingSubscription.next_billing_date,
          description: editingSubscription.description,
          is_active: editingSubscription.is_active
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      setEditingSubscription(null);
      await reloadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription');
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await reloadSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Failed to delete subscription');
    }
  };

  const handleApplySubscription = async (subscription: Subscription) => {
    // Add subscription as an expense for the current month
    try {
      await addExpense({
        description: `${subscription.name} (Subscription)`,
        amount: subscription.amount,
        date: new Date().toISOString().split('T')[0],
        category: subscription.category,
        currency: subscription.currency
      });

      // Update next billing date
      const nextDate = new Date(subscription.next_billing_date);
      if (subscription.billing_cycle === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      await supabase
        .from('subscriptions')
        .update({ next_billing_date: nextDate.toISOString().split('T')[0] })
        .eq('id', subscription.id);

      await reloadSubscriptions();
      alert('Subscription applied to expenses!');
    } catch (error) {
      console.error('Error applying subscription:', error);
      alert('Failed to apply subscription');
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-up">
        <div className="pl-16 lg:pl-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Expenses</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">Track and manage your spending</p>
        </div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          showAllOption={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Total Expenses Card, Add Form, and Subscriptions */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Total Expenses Card */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 md:p-6 text-white">
            <div className="flex items-center mb-2">
              <CreditCard className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-semibold">
                {selectedMonth === 'all' ? 'Current Month Expenses' : 'Month Expenses'}
              </h3>
            </div>
            <p className="text-white text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
            <p className="text-white text-sm mt-1">
              {selectedMonth === 'all'
                ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              }
            </p>
          </div>

          {/* Add New Expense Form */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Add New Expense</h2>

              {/* AI/Manual Toggle */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!isAIMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                  Manual
                </span>
                <button
                  onClick={() => setIsAIMode(!isAIMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAIMode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-[var(--card-border)]'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAIMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <span className={`text-sm flex items-center gap-1 ${isAIMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                  <Sparkles className="h-3 w-3" />
                  AI
                </span>
              </div>
            </div>

            {/* AI Mode */}
            {isAIMode ? (
              <div className="space-y-4">
                <p className="text-m text-[var(--text-secondary)] text-center">
                  Just describe your expense naturally, we&apos;ll handle the rest
                </p>

                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Try: 'Coffee this morning RM 12' or 'Grab ride yesterday $25' or 'Dinner with friends $80'"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAIProcess();
                      }
                    }}
                  />
                  <button
                    onClick={handleAIProcess}
                    disabled={!aiInput.trim() || isProcessing}
                    className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Review Form (Inline - shown after AI processing) */}
                {showReviewModal && reviewData && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review & Confirm</h3>
                      {reviewData.method && (
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${reviewData.method === 'keyword'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                          }`}>
                          <Check className="h-3 w-3" />
                          AI-detected
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={reviewData.description}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Capitalize first letter
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          setReviewData({ ...reviewData, description: capitalized });
                        }}
                        className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={reviewData.amount}
                          onChange={(e) => setReviewData({ ...reviewData, amount: e.target.value })}
                          step="0.01"
                          min="0"
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={reviewData.date}
                          onChange={(e) => setReviewData({ ...reviewData, date: e.target.value })}
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Currency
                        </label>
                        <select
                          value={reviewData.currency}
                          onChange={(e) => setReviewData({ ...reviewData, currency: e.target.value })}
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Category
                        </label>
                        <select
                          value={reviewData.category}
                          onChange={(e) => setReviewData({ ...reviewData, category: e.target.value })}
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Wallet
                      </label>
                      <select
                        value={reviewData.wallet_id || ''}
                        onChange={(e) => setReviewData({ ...reviewData, wallet_id: e.target.value })}
                        className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {wallets.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name} {wallet.is_default ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleReviewConfirm}
                      disabled={isAddingExpense}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingExpense ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {isAddingExpense ? 'Adding...' : 'Add Expense'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Manual Mode - Original Form */
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="e.g., Groceries from Market"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-[var(--text-secondary)]">{currencySymbol}</span>
                      <input
                        type="number"
                        id="amount"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                    <select
                      value={newExpense.currency}
                      onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="category" className="block text-sm font-medium text-[var(--text-secondary)]">
                        Category
                      </label>
                      {autoCategoryMethod && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-blue-500/20 text-blue-400">
                          <Sparkles className="h-3 w-3" />
                          Auto detected
                        </span>
                      )}
                      {isAutoCategorizing && (
                        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Detecting...
                        </span>
                      )}
                    </div>
                    <select
                      id="category"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Wallet selector - full width */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Wallet</label>
                  <select
                    value={newExpense.wallet_id}
                    onChange={(e) => setNewExpense({ ...newExpense, wallet_id: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} {wallet.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAddingExpense}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingExpense ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isAddingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </form>
            )}
          </div>

          {/* Subscriptions Section */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Subscriptions</h2>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-sm text-center py-4">No subscriptions yet</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setEditingSubscription(sub)}
                    className="flex items-center justify-between p-3 glass-card rounded-xl transition-all duration-300 hover:border-slate-600 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-[var(--text-primary)] font-medium text-sm">{sub.name}</p>
                        {!sub.is_active && (
                          <span className="text-xs bg-slate-700 text-[var(--text-secondary)] px-2 py-0.5 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-[var(--text-secondary)] text-xs mt-1">
                        {getCurrencyFormatter(sub.currency)(sub.amount)} / {sub.billing_cycle}
                      </p>
                      <p className="text-[var(--text-tertiary)] text-xs">Next: {new Date(sub.next_billing_date).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplySubscription(sub);
                      }}
                      className="bg-green-400 hover:bg-green-500 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors whitespace-nowrap"
                      title="Apply to expenses"
                    >
                      Apply to expense
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expenses List Grouped by Month/Day */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4 md:mb-6">Expenses</h2>

            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">No expenses yet. Add your first expense to get started!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedExpenses).map(([month, days]) => (
                  <div key={month}>
                    {/* Month Header */}
                    <h3 className="text-[var(--text-primary)] font-semibold mb-4 py-2">{month}</h3>

                    {Object.entries(days).map(([day, dayExpenses]) => {
                      const dayTotal = dayExpenses.reduce((sum, exp) => {
                        // Convert each expense to profile currency
                        const amountInProfileCurrency = convertCurrency(exp.amount, exp.currency || 'USD', profileCurrency);
                        return sum + amountInProfileCurrency;
                      }, 0);
                      return (
                        <div key={day} className="mb-4">
                          {/* Day Header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-sm font-medium">{day}</span>
                            <span className="text-[var(--text-secondary)] text-sm">Total: {formatCurrency(dayTotal)}</span>
                          </div>

                          {/* Expenses for this day */}
                          <div className="space-y-2">
                            {dayExpenses.map((expense) => {
                              const IconComponent = getCategoryIcon(expense.category);
                              return (
                                <div
                                  key={expense.id}
                                  onClick={() => handleEditExpense(expense)}
                                  className="flex items-center justify-between p-4 glass-card rounded-xl transition-all duration-300 hover:border-slate-600 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center flex-1">
                                    <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                                      <IconComponent className="h-5 w-5 text-[var(--accent-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-[var(--text-primary)] font-medium">{expense.description}</h3>
                                      <p className="text-[var(--text-secondary)] text-sm">{expense.category}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <p className="text-red-400 font-semibold">-{getCurrencyFormatter(expense.currency || profileCurrency)(expense.amount)}</p>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteExpense(expense.id);
                                        }}
                                        disabled={deletingExpense === expense.id}
                                        className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete expense"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Expense</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[var(--text-secondary)]">{getCurrencySymbol((editingExpense as Expense & { currency?: string })?.currency || profileCurrency)}</span>
                    <input
                      type="number"
                      value={editingExpense.amount}
                      onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })}
                      step="0.01"
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Date</label>
                  <input
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
                <select
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={(editingExpense as Expense & { currency?: string }).currency || profileCurrency}
                  onChange={(e) => setEditingExpense({ ...(editingExpense as Expense & { currency?: string }), currency: e.target.value } as Expense)}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Wallet</label>
                <select
                  value={editingExpense?.wallet_id || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense!, wallet_id: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} {wallet.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateExpense}
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showSubscriptionModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setShowSubscriptionModal(false)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add Subscription</h3>

            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Name</label>
                <input
                  type="text"
                  value={newSubscription.name}
                  onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })}
                  placeholder="e.g., Netflix, Spotify"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
                  <input
                    type="number"
                    value={newSubscription.amount}
                    onChange={(e) => setNewSubscription({ ...newSubscription, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                  <select
                    value={newSubscription.currency}
                    onChange={(e) => setNewSubscription({ ...newSubscription, currency: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
                <select
                  value={newSubscription.category}
                  onChange={(e) => setNewSubscription({ ...newSubscription, category: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Billing Cycle</label>
                  <select
                    value={newSubscription.billing_cycle}
                    onChange={(e) => setNewSubscription({ ...newSubscription, billing_cycle: e.target.value as 'monthly' | 'yearly' })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Next Billing</label>
                  <input
                    type="date"
                    value={newSubscription.next_billing_date}
                    onChange={(e) => setNewSubscription({ ...newSubscription, next_billing_date: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={newSubscription.description}
                  onChange={(e) => setNewSubscription({ ...newSubscription, description: e.target.value })}
                  placeholder="Additional notes"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Add Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSubscription && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingSubscription(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Subscription</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Name</label>
                <input
                  type="text"
                  value={editingSubscription.name}
                  onChange={(e) => setEditingSubscription({ ...editingSubscription, name: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
                  <input
                    type="number"
                    value={editingSubscription.amount}
                    onChange={(e) => setEditingSubscription({ ...editingSubscription, amount: parseFloat(e.target.value) })}
                    step="0.01"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                  <select
                    value={editingSubscription.currency}
                    onChange={(e) => setEditingSubscription({ ...editingSubscription, currency: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
                <select
                  value={editingSubscription.category}
                  onChange={(e) => setEditingSubscription({ ...editingSubscription, category: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Billing Cycle</label>
                  <select
                    value={editingSubscription.billing_cycle}
                    onChange={(e) => setEditingSubscription({ ...editingSubscription, billing_cycle: e.target.value as 'monthly' | 'yearly' })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Next Billing</label>
                  <input
                    type="date"
                    value={editingSubscription.next_billing_date}
                    onChange={(e) => setEditingSubscription({ ...editingSubscription, next_billing_date: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingSubscription.is_active}
                    onChange={(e) => setEditingSubscription({ ...editingSubscription, is_active: e.target.checked })}
                    className="w-4 h-4 bg-slate-800 border-slate-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Active</span>
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleDeleteSubscription(editingSubscription.id)}
                  className="bg-red-400 hover:bg-red-500 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditingSubscription(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSubscription}
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
