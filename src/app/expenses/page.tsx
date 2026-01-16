'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, ShoppingCart, Car, Home, Gamepad2, Trash2, CreditCard, X, Sparkles, Send, Loader2, Check, Camera } from 'lucide-react';
import { CATEGORY_OPTIONS } from '@/constants/categories';
import { useFinance, type Subscription } from '@/context/FinanceContext';
import { useMonth } from '@/context/MonthContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';
import { autoCategorize, parseMultipleExpenses, parseReceiptImage } from '@/lib/autoCategorization';
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
  const { expenses, addExpense, subscriptions, reloadSubscriptions, reloadExpenses, aiExpenseToast, setAiExpenseToast } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [userSettings, setUserSettings] = useState<{ currency?: string; ai_auto_add?: boolean;[key: string]: unknown } | null>(null);
  const [successToast, setSuccessToast] = useState<{
    show: boolean;
    count: number;
    total: number;
    expenses: Array<{ description: string; amount: number; currency: string; date: string }>;
  } | null>(null);

  // Handle AI-created expense toast - show it and scroll to expense
  useEffect(() => {
    if (aiExpenseToast?.show) {
      // Show the toast using the same format as local toast
      setSuccessToast({
        show: true,
        count: aiExpenseToast.count,
        total: aiExpenseToast.total,
        expenses: aiExpenseToast.expenses
      });

      // Scroll to the newly added expense after a brief delay
      setTimeout(() => {
        if (aiExpenseToast.earliestDate) {
          const expenseElement = document.querySelector(`[data-expense-date="${aiExpenseToast.earliestDate}"]`);
          if (expenseElement) {
            expenseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 300);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setSuccessToast(null);
        setAiExpenseToast(null); // Clear the context toast too
      }, 5000);
    }
  }, [aiExpenseToast, setAiExpenseToast]);

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean;
    expenseId: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    category: string;
  } | null>(null);

  // Generic alert modal state (replaces browser alert())
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Subscription delete confirmation modal state
  const [subscriptionDeleteModal, setSubscriptionDeleteModal] = useState<{
    show: boolean;
    id: string;
    name: string;
    amount: number;
    currency: string;
  } | null>(null);

  const [processingStep, setProcessingStep] = useState<{ step: 'processing' | 'adding' | 'done'; current: number; total: number } | null>(null);

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

  // Manual mode - multiple expense rows
  const createEmptyManualExpense = () => ({
    id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: '',
    amount: '',
    date: getDateForSelectedMonth(),
    category: 'Food & Dining',
    currency: userSettings?.currency || 'USD',
    wallet_id: ''
  });

  const [manualExpenses, setManualExpenses] = useState<Array<{
    id: string;
    description: string;
    amount: string;
    date: string;
    category: string;
    currency: string;
    wallet_id: string;
  }>>([]);



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
  const [_isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [_autoCategoryMethod, setAutoCategoryMethod] = useState<'keyword' | 'gemini' | null>(null);
  const autoCategorizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Mode states
  const [isAIMode, setIsAIMode] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewExpenses, setReviewExpenses] = useState<Array<{
    id: string;
    description: string;
    amount: string;
    currency: string;
    date: string;
    category: string;
    wallet_id: string;
  }>>([]);

  // Receipt OCR states
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Wallet state
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Initialize manual expenses when switching to manual mode
  useEffect(() => {
    if (!isAIMode && manualExpenses.length === 0 && wallets.length > 0) {
      const defaultWallet = wallets.find(w => w.is_default);
      setManualExpenses([{
        id: `manual-${Date.now()}`,
        description: '',
        amount: '',
        date: getDateForSelectedMonth(),
        category: 'Food & Dining',
        currency: userSettings?.currency || 'USD',
        wallet_id: defaultWallet?.id || ''
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIMode, wallets]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, selectedMonth]);

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
    // Must have either text input or receipt image
    if (!aiInput.trim() && !receiptFile) return;

    // Clear input immediately for better UX
    const inputText = aiInput;
    setAiInput('');

    setIsProcessing(true);
    try {
      const userCurrency = userSettings?.currency || 'USD';
      const defaultDate = getDateForSelectedMonth();

      // Step 1: Processing
      if (userSettings?.ai_auto_add) {
        setProcessingStep({ step: 'processing', current: 0, total: 0 });
      }

      // Use receipt OCR if image is provided, otherwise use text parsing
      let result;
      if (receiptFile) {
        result = await parseReceiptImage(receiptFile, userCurrency, defaultDate);
        // Clear receipt after processing
        setReceiptFile(null);
        setReceiptPreview(null);
      } else {
        result = await parseMultipleExpenses(inputText, userCurrency, defaultDate);
      }

      // Get default wallet
      const defaultWallet = wallets.find(w => w.is_default);

      // Convert parsed expenses to review format with unique IDs
      const expenses = result.expenses.map((exp, index) => ({
        id: `review-${Date.now()}-${index}`,
        description: exp.description || '',
        amount: exp.amount?.toString() || '',
        currency: exp.currency || userCurrency,
        date: exp.date || defaultDate,
        category: exp.category,
        wallet_id: defaultWallet?.id || ''
      }));

      // Check if auto-add is enabled
      if (userSettings?.ai_auto_add) {
        // Auto-add mode: directly add expenses
        const validExpenses = expenses.filter(exp => exp.amount && parseFloat(exp.amount) > 0);
        if (validExpenses.length === 0) {
          setProcessingStep(null);
          showAlert('No Expenses Found', 'No valid expenses found. Please check your input or receipt image.', 'error');
          return;
        }

        // Track earliest date for scrolling and month switching
        const firstExpenseDate = validExpenses.reduce((earliest, exp) => {
          return exp.date < earliest ? exp.date : earliest;
        }, validExpenses[0].date);

        // Step 2: Adding
        setProcessingStep({ step: 'adding', current: 0, total: validExpenses.length });
        setIsAddingExpense(true);
        let totalAmount = 0;
        const addedExpenses: Array<{ description: string; amount: number; currency: string; date: string }> = [];

        for (let i = 0; i < validExpenses.length; i++) {
          const exp = validExpenses[i];
          setProcessingStep({ step: 'adding', current: i + 1, total: validExpenses.length });

          await addExpense({
            description: exp.description,
            amount: parseFloat(exp.amount),
            date: exp.date,
            category: exp.category,
            currency: exp.currency,
            wallet_id: exp.wallet_id || undefined
          });
          totalAmount += parseFloat(exp.amount);
          addedExpenses.push({
            description: exp.description,
            amount: parseFloat(exp.amount),
            currency: exp.currency,
            date: exp.date
          });
        }

        // Step 3: Done
        setProcessingStep({ step: 'done', current: validExpenses.length, total: validExpenses.length });
        setIsAddingExpense(false);

        // Show success toast with expense details (max 5) and switch to expense month if different
        setTimeout(() => {
          setProcessingStep(null);

          // Switch to the expense month if different from currently selected
          const expenseMonth = firstExpenseDate.substring(0, 7); // YYYY-MM
          if (selectedMonth !== expenseMonth && selectedMonth !== 'all') {
            setSelectedMonth(expenseMonth);
          }

          setSuccessToast({
            show: true,
            count: validExpenses.length,
            total: totalAmount,
            expenses: addedExpenses.slice(0, 5) // Max 5 expenses shown
          });
          setTimeout(() => setSuccessToast(null), 5000); // Longer timeout to read details

          // Scroll to the first added expense (using date as identifier)
          setTimeout(() => {
            const expenseElement = document.querySelector(`[data-expense-date="${firstExpenseDate}"]`);
            if (expenseElement) {
              expenseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300); // Slightly longer delay to allow month change to render
        }, 500);
      } else {
        // Review mode: show review modal
        setReviewExpenses(expenses);
        setShowReviewModal(true);
      }
    } catch (error) {
      console.error('Error processing AI input:', error);
      setProcessingStep(null);
      showAlert('Processing Failed', 'Failed to process expense. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle receipt file selection
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert('Invalid File', 'Please select an image file.', 'error');
      return;
    }

    // Validate file size (max 7MB for Gemini API)
    if (file.size > 7 * 1024 * 1024) {
      showAlert('File Too Large', 'Image file is too large. Maximum size is 7MB.', 'error');
      return;
    }

    setReceiptFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clear selected receipt
  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
    }
  };

  // Handle removing an expense from review list
  const handleRemoveReviewExpense = (id: string) => {
    setReviewExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  // Handle updating a review expense field
  const updateReviewExpense = (id: string, field: string, value: string) => {
    setReviewExpenses(prev => prev.map(exp =>
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  // Handle review confirmation - add all expenses
  const handleReviewConfirm = async () => {
    // Filter out expenses without amounts
    const validExpenses = reviewExpenses.filter(exp => exp.amount && parseFloat(exp.amount) > 0);
    if (validExpenses.length === 0) return;

    setIsAddingExpense(true);
    try {
      // Add all expenses sequentially
      for (const exp of validExpenses) {
        await addExpense({
          description: exp.description,
          amount: parseFloat(exp.amount),
          date: exp.date,
          category: exp.category,
          currency: exp.currency,
          wallet_id: exp.wallet_id || undefined
        });
      }

      // Reset states
      setShowReviewModal(false);
      setReviewExpenses([]);
      setAiInput('');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Filter valid expenses (must have description and amount)
    const validExpenses = manualExpenses.filter(
      exp => exp.description.trim() && exp.amount && parseFloat(exp.amount) > 0
    );

    if (validExpenses.length === 0) return;

    setIsAddingExpense(true);
    try {
      // Add all expenses sequentially
      for (const exp of validExpenses) {
        await addExpense({
          description: exp.description,
          amount: parseFloat(exp.amount),
          date: exp.date,
          category: exp.category,
          currency: exp.currency,
          wallet_id: exp.wallet_id || undefined
        });
      }

      // Reset to single empty row
      const defaultWallet = wallets.find(w => w.is_default);
      setManualExpenses([{
        id: `manual-${Date.now()}`,
        description: '',
        amount: '',
        date: getDateForSelectedMonth(),
        category: 'Food & Dining',
        currency: userSettings?.currency || 'USD',
        wallet_id: defaultWallet?.id || ''
      }]);
      setAutoCategoryMethod(null);
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Show delete confirmation modal with full expense details
  const showDeleteConfirm = (expense: { id: string; description: string; amount: number; currency: string; date: string; category: string }) => {
    setDeleteConfirmModal({
      show: true,
      expenseId: expense.id,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      category: expense.category
    });
  };

  // Show custom alert modal (replaces browser alert())
  const showAlert = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  // Confirm and execute delete
  const confirmDeleteExpense = async () => {
    if (!deleteConfirmModal) return;

    const expenseId = deleteConfirmModal.expenseId;
    setDeleteConfirmModal(null);
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
      showAlert('Delete Failed', 'Failed to delete expense.', 'error');
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
      showAlert('Update Failed', 'Failed to update expense.', 'error');
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
      showAlert('Add Failed', 'Failed to add subscription.', 'error');
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
      showAlert('Update Failed', 'Failed to update subscription.', 'error');
    }
  };

  const showSubscriptionDeleteConfirm = (subscription: Subscription) => {
    setSubscriptionDeleteModal({
      show: true,
      id: subscription.id,
      name: subscription.name,
      amount: subscription.amount,
      currency: subscription.currency
    });
  };

  const confirmDeleteSubscription = async () => {
    if (!subscriptionDeleteModal) return;
    const id = subscriptionDeleteModal.id;
    setSubscriptionDeleteModal(null);

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await reloadSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      showAlert('Delete Failed', 'Failed to delete subscription.', 'error');
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
      showAlert('Subscription Applied', 'Subscription applied to expenses!', 'success');
    } catch (error) {
      console.error('Error applying subscription:', error);
      showAlert('Apply Failed', 'Failed to apply subscription.', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Success Toast for Auto-Add - Centered at top */}
      {successToast?.show && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-up">
          <div className="border rounded-2xl px-5 py-4 shadow-2xl max-w-md w-[28rem]" style={{ backgroundColor: 'var(--background-elevated)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-start gap-3">
              <div className="bg-green-500 rounded-full p-1.5 mt-0.5 shadow-md">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] font-semibold text-sm">
                  Added {successToast.count} expense{successToast.count > 1 ? 's' : ''}
                </p>
                {/* Expense details list (max 5) - Card style rows */}
                <div className="mt-3 space-y-2">
                  {successToast.expenses.map((exp, i) => (
                    <div key={i} className="rounded-xl px-3 py-2.5 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 mr-3">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{exp.description}</p>
                          <p className="text-[var(--text-tertiary)] text-xs">
                            {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="text-[var(--text-primary)] font-semibold text-sm whitespace-nowrap">
                          {getCurrencySymbol(exp.currency)}{exp.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {successToast.count > 5 && (
                    <p className="text-[var(--text-tertiary)] text-xs text-center">
                      +{successToast.count - 5} more...
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)] font-medium">Total:</span>
                    <span className="text-[var(--text-primary)] font-bold">
                      {getCurrencySymbol(userSettings?.currency || 'USD')}{successToast.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSuccessToast(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] rounded-lg p-1.5 -mr-1 -mt-1 transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
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
                  Describe your expense or scan a receipt
                </p>

                {/* Hidden file input for receipt */}
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptSelect}
                  className="hidden"
                  id="receipt-upload"
                />

                {/* Receipt Preview */}
                {receiptPreview && (
                  <div className="relative animate-fade-in">
                    <div className="relative rounded-xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)]">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                        <span className="text-white text-sm font-medium flex items-center gap-1">
                          <Camera className="h-4 w-4" />
                          Receipt ready to scan
                        </span>
                        <button
                          onClick={clearReceipt}
                          className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
                          title="Remove receipt"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={receiptFile ? "Add a note (optional)..." : "Try: 'Coffee this morning $12' or 'Grab ride yesterday $25'"}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-4 py-3 pr-24 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                    disabled={isProcessing && userSettings?.ai_auto_add}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAIProcess();
                      }
                    }}
                  />
                  {/* Button row */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {/* Receipt upload button */}
                    <button
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={isProcessing && userSettings?.ai_auto_add}
                      className={`p-2 rounded-xl transition-all duration-300 ${receiptFile
                        ? 'bg-green-500 text-white'
                        : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Scan receipt"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    {/* Send button */}
                    <button
                      onClick={handleAIProcess}
                      disabled={(!aiInput.trim() && !receiptFile) || (isProcessing && userSettings?.ai_auto_add)}
                      className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Processing Steps - Inline below input */}
                {processingStep && (
                  <div className="animate-fade-in">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {processingStep.step === 'processing' && (
                          <>
                            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                            <div>
                              <p className="text-[var(--text-primary)] font-medium text-sm">Processing...</p>
                              <p className="text-[var(--text-secondary)] text-xs">Analyzing with AI</p>
                            </div>
                          </>
                        )}
                        {processingStep.step === 'adding' && (
                          <>
                            <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                            <div className="flex-1">
                              <p className="text-[var(--text-primary)] font-medium text-sm">
                                Adding expenses... {processingStep.current}/{processingStep.total}
                              </p>
                              <div className="w-full h-1.5 bg-[var(--card-border)] rounded-full mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                                  style={{ width: `${(processingStep.current / processingStep.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                        {processingStep.step === 'done' && (
                          <>
                            <div className="bg-green-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-[var(--text-primary)] font-medium text-sm">Done!</p>
                              <p className="text-[var(--text-secondary)] text-xs">Added {processingStep.total} expense{processingStep.total > 1 ? 's' : ''}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Review Form (Inline - shown after AI processing) */}
                {showReviewModal && reviewExpenses.length > 0 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Review & Confirm ({reviewExpenses.length} expense{reviewExpenses.length > 1 ? 's' : ''})
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1 bg-blue-500/20 text-blue-400">
                        <Sparkles className="h-3 w-3" />
                        AI-detected
                      </span>
                    </div>

                    {/* Expense List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {reviewExpenses.map((expense, index) => (
                        <div
                          key={expense.id}
                          className="glass-card border border-[var(--card-border)] rounded-xl p-3 space-y-3 relative"
                        >
                          {/* Remove button (only show if more than 1 expense) */}
                          {reviewExpenses.length > 1 && (
                            <button
                              onClick={() => handleRemoveReviewExpense(expense.id)}
                              className="absolute top-2 right-2 p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                              title="Remove expense"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          {/* Expense number badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--card-border)] text-[var(--text-secondary)]">
                              #{index + 1}
                            </span>
                          </div>

                          {/* Description */}
                          <input
                            type="text"
                            value={expense.description}
                            onChange={(e) => {
                              const value = e.target.value;
                              const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                              updateReviewExpense(expense.id, 'description', capitalized);
                            }}
                            placeholder="Description"
                            className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          {/* Amount & Currency row */}
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              value={expense.amount}
                              onChange={(e) => updateReviewExpense(expense.id, 'amount', e.target.value)}
                              placeholder="Amount"
                              step="0.01"
                              min="0"
                              className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                              value={expense.currency}
                              onChange={(e) => updateReviewExpense(expense.id, 'currency', e.target.value)}
                              className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          {/* Category & Date row */}
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={expense.category}
                              onChange={(e) => updateReviewExpense(expense.id, 'category', e.target.value)}
                              className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={expense.date}
                              onChange={(e) => updateReviewExpense(expense.id, 'date', e.target.value)}
                              className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Wallet */}
                          <select
                            value={expense.wallet_id}
                            onChange={(e) => updateReviewExpense(expense.id, 'wallet_id', e.target.value)}
                            className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {wallets.map((wallet) => (
                              <option key={wallet.id} value={wallet.id}>
                                {wallet.name} {wallet.is_default ? '(Default)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleReviewConfirm}
                      disabled={isAddingExpense || reviewExpenses.every(exp => !exp.amount)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingExpense ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {isAddingExpense ? 'Adding...' : `Add ${reviewExpenses.length} Expense${reviewExpenses.length > 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Manual Mode - Single Expense Form (like Income page) */
              <form onSubmit={handleAddExpense} className="space-y-4">
                {/* Description with auto-categorization */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={manualExpenses[0]?.description || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);

                      // Update description
                      setManualExpenses(prev => {
                        if (prev.length === 0) return prev;
                        return [{ ...prev[0], description: capitalized }];
                      });

                      // Auto-categorize with debounce
                      if (autoCategorizeTimeoutRef.current) {
                        clearTimeout(autoCategorizeTimeoutRef.current);
                      }

                      if (capitalized.trim().length < 3) {
                        setAutoCategoryMethod(null);
                        return;
                      }

                      setIsAutoCategorizing(true);
                      autoCategorizeTimeoutRef.current = setTimeout(async () => {
                        try {
                          const userCurrency = userSettings?.currency || 'USD';
                          const result = await autoCategorize(capitalized, userCurrency, true);

                          setManualExpenses(prev => {
                            if (prev.length === 0) return prev;
                            const updates: Partial<typeof prev[0]> = {
                              category: result.category
                            };
                            if (result.extractedAmount != null) {
                              updates.amount = result.extractedAmount.toString();
                            }
                            if (result.extractedCurrency) {
                              updates.currency = result.extractedCurrency;
                            }
                            if (result.extractedDate) {
                              updates.date = result.extractedDate;
                            }
                            if (result.cleanedDescription && result.cleanedDescription.trim()) {
                              updates.description = result.cleanedDescription;
                            }
                            return [{ ...prev[0], ...updates }];
                          });
                          setAutoCategoryMethod(result.method === 'default' ? null : result.method);
                        } catch (error) {
                          console.error('Auto-categorization error:', error);
                        } finally {
                          setIsAutoCategorizing(false);
                        }
                      }, 500);
                    }}
                    placeholder="e.g., Coffee at Starbucks $10"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Category with auto-detect indicator */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="category" className="block text-sm font-medium text-[var(--text-secondary)]">
                      Category
                    </label>
                    {_autoCategoryMethod && (
                      <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-blue-500/20 text-blue-400">
                        <Sparkles className="h-3 w-3" />
                        Auto detected
                      </span>
                    )}
                    {_isAutoCategorizing && (
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Detecting...
                      </span>
                    )}
                  </div>
                  <select
                    id="category"
                    value={manualExpenses[0]?.category || 'Food & Dining'}
                    onChange={(e) => {
                      setManualExpenses(prev => {
                        if (prev.length === 0) return prev;
                        return [{ ...prev[0], category: e.target.value }];
                      });
                      setAutoCategoryMethod(null); // Clear auto-detection when user manually changes
                    }}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount & Date row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-[var(--text-secondary)]">
                        {getCurrencySymbol(manualExpenses[0]?.currency || profileCurrency)}
                      </span>
                      <input
                        type="number"
                        id="amount"
                        value={manualExpenses[0]?.amount || ''}
                        onChange={(e) => {
                          setManualExpenses(prev => {
                            if (prev.length === 0) return prev;
                            return [{ ...prev[0], amount: e.target.value }];
                          });
                        }}
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
                      value={manualExpenses[0]?.date || getDateForSelectedMonth()}
                      onChange={(e) => {
                        setManualExpenses(prev => {
                          if (prev.length === 0) return prev;
                          return [{ ...prev[0], date: e.target.value }];
                        });
                      }}
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Currency selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                  <select
                    value={manualExpenses[0]?.currency || userSettings?.currency || 'USD'}
                    onChange={(e) => {
                      setManualExpenses(prev => {
                        if (prev.length === 0) return prev;
                        return [{ ...prev[0], currency: e.target.value }];
                      });
                    }}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Wallet selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Wallet</label>
                  <select
                    value={manualExpenses[0]?.wallet_id || ''}
                    onChange={(e) => {
                      setManualExpenses(prev => {
                        if (prev.length === 0) return prev;
                        return [{ ...prev[0], wallet_id: e.target.value }];
                      });
                    }}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} {wallet.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isAddingExpense || !manualExpenses[0]?.description?.trim() || !manualExpenses[0]?.amount}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
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

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--card-border)] flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-[var(--text-tertiary)]" />
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">No expenses found</p>
                <p className="text-[var(--text-tertiary)] text-sm">
                  {selectedMonth === 'all'
                    ? 'Add your first expense to get started!'
                    : `No expenses for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                </p>
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
                                  data-expense-date={expense.date}
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
                                          showDeleteConfirm({
                                            id: expense.id,
                                            description: expense.description,
                                            amount: expense.amount,
                                            currency: expense.currency || profileCurrency,
                                            date: expense.date,
                                            category: expense.category
                                          });
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
          className="fixed inset-0 modal-overlay animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="solid-modal rounded-2xl p-6 w-full max-w-md animate-scale-in"
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
          className="fixed inset-0 modal-overlay animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setShowSubscriptionModal(false)}
        >
          <div
            className="solid-modal rounded-2xl p-6 w-full max-w-md animate-scale-in"
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
      )
      }

      {/* Edit Subscription Modal */}
      {
        editingSubscription && (
          <div
            className="fixed inset-0 modal-overlay animate-fade-in flex items-center justify-center z-50 p-4"
            onClick={() => setEditingSubscription(null)}
          >
            <div
              className="solid-modal rounded-2xl p-6 w-full max-w-md animate-scale-in"
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
                    onClick={() => showSubscriptionDeleteConfirm(editingSubscription)}
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
        )
      }

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmModal?.show && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Expense</h3>
              </div>

              <p className="text-[var(--text-secondary)] mb-3">
                Are you sure you want to delete this expense?
              </p>

              {/* Expense Card Preview */}
              <div className="glass-card rounded-xl p-4 mb-6 border border-[var(--card-border)]">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[var(--text-primary)] font-medium truncate">{deleteConfirmModal.description}</h4>
                    <p className="text-[var(--text-secondary)] text-sm">{deleteConfirmModal.category}</p>
                  </div>
                  <p className="text-red-400 font-semibold whitespace-nowrap ml-3">
                    -{getCurrencySymbol(deleteConfirmModal.currency)}{deleteConfirmModal.amount.toFixed(2)}
                  </p>
                </div>
                <p className="text-[var(--text-tertiary)] text-xs">
                  {new Date(deleteConfirmModal.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="flex-1 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold border border-[var(--card-border)]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteExpense}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Subscription Delete Confirmation Modal */}
      {subscriptionDeleteModal?.show && (
        <div
          className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSubscriptionDeleteModal(null)}
        >
          <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Subscription</h3>
            </div>

            <p className="text-[var(--text-secondary)] mb-3">
              Are you sure you want to delete this subscription?
            </p>

            {/* Subscription Card Preview */}
            <div className="glass-card rounded-xl p-4 mb-6 border border-[var(--card-border)]">
              <div className="flex justify-between items-start">
                <h4 className="text-[var(--text-primary)] font-medium truncate">{subscriptionDeleteModal.name}</h4>
                <p className="text-red-400 font-semibold whitespace-nowrap ml-3">
                  -{getCurrencySymbol(subscriptionDeleteModal.currency)}{subscriptionDeleteModal.amount.toFixed(2)}/mo
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSubscriptionDeleteModal(null)}
                className="flex-1 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold border border-[var(--card-border)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubscription}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Alert Modal */}
      {
        alertModal?.show && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${alertModal.type === 'error' ? 'bg-red-500/20' :
                  alertModal.type === 'success' ? 'bg-green-500/20' : 'bg-blue-500/20'
                  }`}>
                  {alertModal.type === 'error' ? (
                    <X className={`h-5 w-5 text-red-400`} />
                  ) : alertModal.type === 'success' ? (
                    <Check className={`h-5 w-5 text-green-400`} />
                  ) : (
                    <Sparkles className={`h-5 w-5 text-blue-400`} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{alertModal.title}</h3>
              </div>

              <p className="text-[var(--text-secondary)] mb-6">
                {alertModal.message}
              </p>

              <button
                onClick={() => setAlertModal(null)}
                className={`w-full py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg ${alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                  alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' :
                    'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
              >
                OK
              </button>
            </div>
          </div>
        )
      }

    </div >
  );
}
