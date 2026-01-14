'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, DollarSign, Briefcase, Trash2, Send, Loader2, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';
import { autoCategorize, detectIncomeSourceWithGemini } from '@/lib/autoCategorization';
import { Wallet as WalletType, getWallets, ensureDefaultWallet } from '@/lib/wallets';

interface Income {
  id: string;
  amount: number;
  source: string;
  description?: string;
  date: string;
  currency?: string;
  wallet_id?: string;
}

const incomeSources = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Rental',
  'Gift',
  'Bonus',
  'Other'
];

export default function IncomePage() {
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [newIncome, setNewIncome] = useState({
    source: 'Salary',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    wallet_id: ''
  });
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean;
    incomeId: string;
    source: string;
    amount: number;
    currency: string;
    date: string;
  } | null>(null);
  const [userSettings, setUserSettings] = useState<{ currency?: string;[key: string]: unknown } | null>(null);

  // AI Mode states
  const [isAIMode, setIsAIMode] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<{
    source: string;
    amount: string;
    description: string;
    date: string;
    currency: string;
    wallet_id: string;
  } | null>(null);

  // Wallet state
  const [wallets, setWallets] = useState<WalletType[]>([]);

  // Auto-source detection state
  const [autoSourceMethod, setAutoSourceMethod] = useState<'auto' | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const autoSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadIncome();
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sync form date with selected month
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      setNewIncome(prev => ({ ...prev, date: getDateForSelectedMonth() }));
    }
  }, [selectedMonth]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    if (data) {
      setUserSettings(data);
      setNewIncome(prev => ({ ...prev, currency: data.currency || 'USD' }));
    }

    // Load wallets
    if (user?.id) {
      await ensureDefaultWallet(user.id, data?.currency || 'USD');
      const userWallets = await getWallets(user.id);
      setWallets(userWallets);
      // Set default wallet_id
      const defaultWallet = userWallets.find(w => w.is_default);
      if (defaultWallet) {
        setNewIncome(prev => ({ ...prev, wallet_id: defaultWallet.id }));
      }
    }
  };

  const profileCurrency = userSettings?.currency || 'USD';
  const formatCurrency = getCurrencyFormatter(profileCurrency);
  const currencySymbol = getCurrencySymbol(newIncome.currency || profileCurrency);

  // Filter income by selected month (or show all)
  const filteredIncome = useMemo(() => {
    if (selectedMonth === 'all') {
      return income;
    }
    return income.filter(inc => {
      const incomeDate = new Date(inc.date);
      const [year, month] = selectedMonth.split('-');
      return incomeDate.getFullYear() === parseInt(year) &&
        incomeDate.getMonth() + 1 === parseInt(month);
    });
  }, [income, selectedMonth]);

  // Group income by month and day
  const groupedIncome = useMemo(() => {
    return filteredIncome.reduce((acc, inc) => {
      const date = new Date(inc.date);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      if (!acc[monthYear]) {
        acc[monthYear] = {};
      }
      if (!acc[monthYear][day]) {
        acc[monthYear][day] = [];
      }
      acc[monthYear][day].push(inc);
      return acc;
    }, {} as Record<string, Record<string, Income[]>>);
  }, [filteredIncome]);

  // Handle AI input processing
  const handleAIProcess = async () => {
    if (!aiInput.trim()) return;

    setIsProcessing(true);
    try {
      const userCurrency = userSettings?.currency || 'USD';
      const result = await autoCategorize(aiInput, userCurrency, true);

      // Map to income source (try to detect from description or use default)
      const detectedSource = detectIncomeSource(result.cleanedDescription || aiInput);

      // Get default wallet
      const defaultWallet = wallets.find(w => w.is_default);

      // Use extracted date if available, otherwise use selected month with today's day
      const defaultDate = getDateForSelectedMonth();

      setReviewData({
        source: detectedSource,
        amount: result.extractedAmount?.toString() || '',
        description: result.cleanedDescription || aiInput,
        date: result.extractedDate || defaultDate,
        currency: result.extractedCurrency || userCurrency,
        wallet_id: defaultWallet?.id || ''
      });

      setShowReviewModal(true);
    } catch (error) {
      console.error('Error processing AI input:', error);
      alert('Failed to process income. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Detect income source from description
  const detectIncomeSource = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('salary') || desc.includes('paycheck') || desc.includes('wage')) return 'Salary';
    if (desc.includes('freelance') || desc.includes('project') || desc.includes('gig')) return 'Freelance';
    if (desc.includes('business') || desc.includes('profit')) return 'Business';
    if (desc.includes('invest') || desc.includes('dividend') || desc.includes('stock')) return 'Investment';
    if (desc.includes('rent') || desc.includes('rental') || desc.includes('lease')) return 'Rental';
    if (desc.includes('gift') || desc.includes('present')) return 'Gift';
    if (desc.includes('bonus') || desc.includes('commission')) return 'Bonus';
    return 'Other';
  };

  // Handle description change with auto-source detection (using Gemini API)
  const handleDescriptionChange = (description: string) => {
    setNewIncome({ ...newIncome, description });

    // Clear previous timeout
    if (autoSourceTimeoutRef.current) {
      clearTimeout(autoSourceTimeoutRef.current);
    }

    // Don't auto-detect if description is too short
    if (description.trim().length < 3) {
      setAutoSourceMethod(null);
      setIsAutoDetecting(false);
      return;
    }

    // Show detecting state
    setIsAutoDetecting(true);

    // Debounce auto-detection (wait 500ms after user stops typing for API call)
    autoSourceTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await detectIncomeSourceWithGemini(description);
        // Always set the source, even if Other
        setNewIncome(prev => ({ ...prev, source: result.source }));
        // Show auto-detected indicator if confidence is not low
        setAutoSourceMethod(result.confidence !== 'low' ? 'auto' : null);
      } catch (error) {
        console.error('Error detecting income source:', error);
      } finally {
        setIsAutoDetecting(false);
      }
    }, 500);
  };

  // Handle review confirmation
  const handleReviewConfirm = async () => {
    if (!reviewData || !reviewData.amount) return;

    try {
      const { data, error } = await supabase
        .from('income')
        .insert({
          user_id: user?.id,
          amount: parseFloat(reviewData.amount),
          source: reviewData.source,
          description: reviewData.description,
          date: reviewData.date,
          currency: reviewData.currency,
          wallet_id: reviewData.wallet_id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state and sort by date (newest first)
      setIncome([...income, data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      setShowReviewModal(false);
      setReviewData(null);
      setAiInput('');
    } catch (error) {
      console.error('Error adding income:', error);
      alert('Failed to add income');
    }
  };

  const handleAddIncome = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (newIncome.source && newIncome.amount) {
      try {
        const { data, error } = await supabase
          .from('income')
          .insert({
            user_id: user?.id,
            amount: parseFloat(newIncome.amount),
            source: newIncome.source,
            description: newIncome.description,
            date: newIncome.date,
            currency: newIncome.currency,
            wallet_id: newIncome.wallet_id || null
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state and sort by date (newest first)
        setIncome([...income, data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const defaultWallet = wallets.find(w => w.is_default);
        setNewIncome({
          source: 'Salary',
          amount: '',
          description: '',
          date: getDateForSelectedMonth(),
          currency: userSettings?.currency || 'USD',
          wallet_id: defaultWallet?.id || ''
        });
      } catch (error) {
        console.error('Error adding income:', error);
        alert('Failed to add income');
      }
    }
  };

  const showDeleteConfirm = (inc: Income) => {
    setDeleteConfirmModal({
      show: true,
      incomeId: inc.id,
      source: inc.source,
      amount: inc.amount,
      currency: inc.currency || 'USD',
      date: inc.date
    });
  };

  const confirmDeleteIncome = async () => {
    if (!deleteConfirmModal) return;

    const incomeId = deleteConfirmModal.incomeId;
    setDeleteConfirmModal(null);
    setDeletingIncome(incomeId);
    try {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', incomeId);

      if (error) throw error;

      setIncome(income.filter(inc => inc.id !== incomeId));
    } catch (error) {
      console.error('Error deleting income:', error);
      alert('Failed to delete income');
    } finally {
      setDeletingIncome(null);
    }
  };

  const handleUpdateIncome = async () => {
    if (!editingIncome) return;

    try {
      const { error } = await supabase
        .from('income')
        .update({
          source: editingIncome.source,
          amount: editingIncome.amount,
          description: editingIncome.description,
          date: editingIncome.date,
          currency: (editingIncome as Income & { currency?: string }).currency || profileCurrency,
          wallet_id: editingIncome.wallet_id || null
        })
        .eq('id', editingIncome.id);

      if (error) throw error;

      setIncome(income.map(inc => inc.id === editingIncome.id ? editingIncome : inc));
      setEditingIncome(null);
    } catch (error) {
      console.error('Error updating income:', error);
      alert('Failed to update income');
    }
  };

  const totalIncome = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';

    // Use selected month if not 'all', otherwise use current month
    const targetMonth = selectedMonth === 'all'
      ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      : selectedMonth;

    return income
      .filter(inc => {
        const incDate = new Date(inc.date);
        const incMonth = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
        return incMonth === targetMonth;
      })
      .reduce((sum, inc) => {
        const amountInProfileCurrency = convertCurrency(
          inc.amount,
          inc.currency || 'USD',
          profileCurrency
        );
        return sum + amountInProfileCurrency;
      }, 0);
  }, [income, userSettings, selectedMonth]);

  // Calculate income by source for current month
  const _incomeBySource = useMemo(() => {
    const profileCurrency = userSettings?.currency || 'USD';
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sourceTotals: Record<string, number> = {};

    income
      .filter(inc => {
        const incDate = new Date(inc.date);
        const incMonth = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
        return incMonth === currentMonth;
      })
      .forEach(inc => {
        const amountInProfileCurrency = convertCurrency(
          inc.amount,
          inc.currency || 'USD',
          profileCurrency
        );
        sourceTotals[inc.source] = (sourceTotals[inc.source] || 0) + amountInProfileCurrency;
      });

    const total = Object.values(sourceTotals).reduce((sum, val) => sum + val, 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

    return {
      total,
      sources: Object.entries(sourceTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }))
    };
  }, [income, userSettings]);

  if (loading) {
    return (
      <div className="p-6 bg-[var(--background)] min-h-screen flex items-center justify-center transition-colors duration-300">
        <div className="text-center animate-scale-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="relative spinner rounded-full h-16 w-16 border-4 border-[var(--text-tertiary)] border-t-transparent"></div>
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-up">
        <div className="pl-16 lg:pl-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Income</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">Track all your income sources</p>
        </div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          showAllOption={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Total Income Card and Add Form */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Total Income Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 md:p-6 text-white">
            <div className="flex items-center mb-2">
              <DollarSign className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-semibold">
                {selectedMonth === 'all' ? 'Current Month Income' : 'Month Income'}
              </h3>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
            <p className="text-white text-sm mt-1">
              {selectedMonth === 'all'
                ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              }
            </p>
          </div>

          {/* Add New Income Form */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Add New Income</h2>

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

            {isAIMode ? (
              <div className="space-y-4">
                <p className="text-m text-[var(--text-secondary)] text-center">
                  Just describe your income naturally, we&apos;ll handle the rest
                </p>

                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Try: 'Salary payment $5000' or 'Freelance project RM 2000 yesterday'"
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

                {/* Review Form (Inline) */}
                {showReviewModal && reviewData && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review & Confirm</h3>
                      <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1 bg-blue-500/20 text-blue-400">
                        <Check className="h-3 w-3" />
                        AI-detected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Source</label>
                        <select
                          value={reviewData.source}
                          onChange={(e) => setReviewData({ ...reviewData, source: e.target.value })}
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {incomeSources.map((source) => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
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
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
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
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Date</label>
                        <input
                          type="date"
                          value={reviewData.date}
                          onChange={(e) => setReviewData({ ...reviewData, date: e.target.value })}
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description (Optional)</label>
                      <input
                        type="text"
                        value={reviewData.description}
                        onChange={(e) => setReviewData({ ...reviewData, description: e.target.value })}
                        className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Wallet</label>
                      <select
                        value={reviewData.wallet_id}
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
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Add Income
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddIncome} className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={newIncome.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="e.g., Monthly salary from Company XYZ"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="source" className="block text-sm font-medium text-[var(--text-secondary)]">
                      Source
                    </label>
                    {autoSourceMethod && (
                      <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-green-500/20 text-green-400">
                        <Sparkles className="h-3 w-3" />
                        Auto detected
                      </span>
                    )}
                    {isAutoDetecting && (
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Detecting...
                      </span>
                    )}
                  </div>
                  <select
                    id="source"
                    value={newIncome.source}
                    onChange={(e) => {
                      setNewIncome({ ...newIncome, source: e.target.value });
                      setAutoSourceMethod(null); // Clear auto-detection when user manually changes
                    }}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {incomeSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
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
                        value={newIncome.amount}
                        onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      value={newIncome.date}
                      onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                {/* Currency selector below amount */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                  <select
                    value={newIncome.currency}
                    onChange={(e) => setNewIncome({ ...newIncome, currency: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    value={newIncome.wallet_id}
                    onChange={(e) => setNewIncome({ ...newIncome, wallet_id: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Income
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Income List Grouped by Month/Day */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4 md:mb-6">Income</h2>

            {filteredIncome.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--card-border)] flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-[var(--text-tertiary)]" />
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">No income found</p>
                <p className="text-[var(--text-tertiary)] text-sm">
                  {selectedMonth === 'all'
                    ? 'Add your first income to get started!'
                    : `No income for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedIncome).map(([month, days]) => (
                  <div key={month}>
                    {/* Month Header */}
                    <h3 className="text-[var(--text-primary)] font-semibold mb-4 py-2">{month}</h3>

                    {Object.entries(days).map(([day, dayIncome]) => {
                      const dayTotal = dayIncome.reduce((sum, inc) => {
                        // Convert each income to profile currency
                        const amountInProfileCurrency = convertCurrency(inc.amount, inc.currency || 'USD', profileCurrency);
                        return sum + amountInProfileCurrency;
                      }, 0);
                      return (
                        <div key={day} className="mb-4">
                          {/* Day Header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-sm font-medium">{day}</span>
                            <span className="text-green-400 text-sm">Total: {formatCurrency(dayTotal)}</span>
                          </div>

                          {/* Income for this day */}
                          <div className="space-y-2">
                            {dayIncome.map((inc) => (
                              <div
                                key={inc.id}
                                onClick={() => setEditingIncome(inc)}
                                className="flex items-center justify-between p-4 glass-card rounded-xl hover:bg-[var(--card-hover)] transition-all duration-300 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center flex-1">
                                  <div className="p-3 bg-green-500/20 rounded-lg mr-4">
                                    <Briefcase className="h-5 w-5 text-green-400" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-[var(--text-primary)] font-medium">{inc.description || inc.source}</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">{inc.source}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <p className="text-green-400 font-semibold">+{getCurrencyFormatter(inc.currency || profileCurrency)(inc.amount)}</p>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showDeleteConfirm(inc);
                                      }}
                                      disabled={deletingIncome === inc.id}
                                      className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                      title="Delete income"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal?.show && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Income</h3>
            </div>

            <p className="text-[var(--text-secondary)] mb-3">
              Are you sure you want to delete this income?
            </p>

            {/* Income Card Preview */}
            <div className="glass-card rounded-xl p-4 mb-6 border border-[var(--card-border)]">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[var(--text-primary)] font-medium truncate">{deleteConfirmModal.source}</h4>
                </div>
                <p className="text-green-400 font-semibold whitespace-nowrap ml-3">
                  +{getCurrencySymbol(deleteConfirmModal.currency)}{deleteConfirmModal.amount.toFixed(2)}
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
                onClick={confirmDeleteIncome}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {editingIncome && (
        <div
          className="fixed inset-0 modal-overlay animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingIncome(null)}
        >
          <div
            className="solid-modal rounded-2xl p-6 w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Income</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Source</label>
                <select
                  value={editingIncome.source}
                  onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {incomeSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                <input
                  type="text"
                  value={editingIncome.description || ''}
                  onChange={(e) => setEditingIncome({ ...editingIncome, description: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[var(--text-secondary)]">{getCurrencySymbol((editingIncome as Income & { currency?: string })?.currency || profileCurrency)}</span>
                    <input
                      type="number"
                      value={editingIncome.amount}
                      onChange={(e) => setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) })}
                      step="0.01"
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Date</label>
                  <input
                    type="date"
                    value={editingIncome.date}
                    onChange={(e) => setEditingIncome({ ...editingIncome, date: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={(editingIncome as Income & { currency?: string }).currency || profileCurrency}
                  onChange={(e) => setEditingIncome({ ...(editingIncome as Income & { currency?: string }), currency: e.target.value } as Income)}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Wallet</label>
                <select
                  value={editingIncome?.wallet_id || ''}
                  onChange={(e) => setEditingIncome({ ...editingIncome!, wallet_id: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  onClick={() => setEditingIncome(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateIncome}
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
