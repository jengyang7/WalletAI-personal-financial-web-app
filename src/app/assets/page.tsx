'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Wallet, Trash2, TrendingUp, History, ArrowUpRight, ArrowDownRight, Sparkles, Send, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import { MonthEndSavingsLog, getMonthEndSavingsHistory, deleteMonthEndSavingsLog } from '@/lib/monthEndSavings';
import { autoCategorize } from '@/lib/autoCategorization';

interface Asset {
  id: string;
  name: string;
  type: string;
  amount: number;
  description?: string;
  currency?: string;
}

interface Holding {
  id: string;
  symbol: string;
  shares: number;
  average_price: number;
  current_price?: number;
  asset_class?: string;
  currency?: string;
}

const defaultAssetTypes = [
  'Cash',
  'Bank Account',
  'Investment',
  'E-Wallet',
  'Cryptocurrency',
  'Real Estate',
  'Vehicle',
  'Other'
];

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'Cash',
    amount: '',
    description: '',
    customType: '',
    currency: 'USD'
  });
  const [userSettings, setUserSettings] = useState<{ currency?: string; [key: string]: unknown } | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);
  const [showCustomType, setShowCustomType] = useState(false);
  const isLoadingRef = useRef(false);

  // AI Mode states
  const [isAIMode, setIsAIMode] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<{
    name: string;
    type: string;
    amount: string;
    description: string;
    currency: string;
  } | null>(null);

  // Transfer history state
  const [transferHistory, setTransferHistory] = useState<MonthEndSavingsLog[]>([]);
  const [deletingTransfer, setDeletingTransfer] = useState<string | null>(null);
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (isLoadingRef.current) return;

    let mounted = true;
    isLoadingRef.current = true;

    const loadData = async () => {
      try {
        // Load settings
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (mounted && settingsData) {
          setUserSettings(settingsData);
          setNewAsset(prev => ({ ...prev, currency: settingsData.currency || 'USD' }));
        }

        // Load holdings
        const { data: holdingsData, error: holdingsError } = await supabase
          .from('holdings')
          .select('*')
          .order('updated_at', { ascending: false });
        if (mounted && !holdingsError) setHoldings((holdingsData || []) as Holding[]);

        // Load assets
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .order('created_at', { ascending: false });
        if (mounted && !assetsError) setAssets((assetsData || []) as Asset[]);

        // Load transfer history
        const history = await getMonthEndSavingsHistory(12);
        if (mounted) setTransferHistory(history);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (mounted) setLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadData();

    return () => {
      mounted = false;
      isLoadingRef.current = false;
    };
  }, [user?.id]);

  const profileCurrency = userSettings?.currency || 'USD';
  const formatBy = (code?: string) => getCurrencyFormatter(code || profileCurrency);
  const formatCurrency = getCurrencyFormatter(profileCurrency);
  const symbol = getCurrencySymbol(newAsset.currency || profileCurrency);

  // Group assets by type
  const groupedAssets = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (!acc[asset.type]) {
        acc[asset.type] = [];
      }
      acc[asset.type].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [assets]);

  // Detect asset type from description
  const detectAssetType = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('cash') || desc.includes('money')) return 'Cash';
    if (desc.includes('bank') || desc.includes('account') || desc.includes('saving')) return 'Bank Account';
    if (desc.includes('invest') || desc.includes('stock') || desc.includes('bond') || desc.includes('fund')) return 'Investment';
    if (desc.includes('wallet') || desc.includes('paypal') || desc.includes('venmo') || desc.includes('grab') || desc.includes('touchngo')) return 'E-Wallet';
    if (desc.includes('crypto') || desc.includes('bitcoin') || desc.includes('ethereum') || desc.includes('btc') || desc.includes('eth')) return 'Cryptocurrency';
    if (desc.includes('house') || desc.includes('property') || desc.includes('real estate') || desc.includes('land')) return 'Real Estate';
    if (desc.includes('car') || desc.includes('vehicle') || desc.includes('motorcycle') || desc.includes('bike')) return 'Vehicle';
    return 'Other';
  };

  // Handle AI input processing
  const handleAIProcess = async () => {
    if (!aiInput.trim()) return;
    
    setIsProcessing(true);
    try {
      const userCurrency = userSettings?.currency || 'USD';
      const result = await autoCategorize(aiInput, userCurrency, true);
      
      // Detect asset type from description
      const detectedType = detectAssetType(result.cleanedDescription || aiInput);
      
      // Extract asset name from description (first few words)
      const cleanedDesc = result.cleanedDescription || aiInput;
      const words = cleanedDesc.split(' ').filter(w => w.length > 0);
      const assetName = words.slice(0, Math.min(4, words.length)).join(' ');
      
      setReviewData({
        name: assetName || cleanedDesc.substring(0, 50),
        type: detectedType,
        amount: result.extractedAmount?.toString() || '',
        description: cleanedDesc,
        currency: result.extractedCurrency || userCurrency
      });
      
      setShowReviewModal(true);
    } catch (error) {
      console.error('Error processing AI input:', error);
      alert('Failed to process asset. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle review confirmation
  const handleReviewConfirm = async () => {
    if (!reviewData || !reviewData.amount) return;
    
    try {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: user?.id,
          name: reviewData.name,
          type: reviewData.type,
          amount: parseFloat(reviewData.amount),
          description: reviewData.description,
          currency: reviewData.currency
        })
        .select()
        .single();

      if (error) throw error;

      setAssets([data, ...assets]);
      setShowReviewModal(false);
      setReviewData(null);
      setAiInput('');
    } catch (error) {
      console.error('Error adding asset:', error);
      alert('Failed to add asset');
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const assetType = showCustomType ? newAsset.customType : newAsset.type;

    if (newAsset.name && assetType && newAsset.amount) {
      try {
        const { data, error } = await supabase
          .from('assets')
          .insert({
            user_id: user?.id,
            name: newAsset.name,
            type: assetType,
            amount: parseFloat(newAsset.amount),
            description: newAsset.description,
            currency: newAsset.currency
          })
          .select()
          .single();

        if (error) throw error;

        setAssets([data, ...assets]);
        setNewAsset({
          name: '',
          type: 'Cash',
          amount: '',
          description: '',
          customType: '',
          currency: profileCurrency
        });
        setShowCustomType(false);
      } catch (error) {
        console.error('Error adding asset:', error);
        alert('Failed to add asset');
      }
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    setDeletingAsset(assetId);
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      setAssets(assets.filter(asset => asset.id !== assetId));
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset');
    } finally {
      setDeletingAsset(null);
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset) return;

    try {
      const { error } = await supabase
        .from('assets')
        .update({
          name: editingAsset.name,
          type: editingAsset.type,
          amount: editingAsset.amount,
          description: editingAsset.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAsset.id);

      if (error) throw error;

      setAssets(assets.map(asset => asset.id === editingAsset.id ? editingAsset : asset));
      setEditingAsset(null);
    } catch (error) {
      console.error('Error updating asset:', error);
      alert('Failed to update asset');
    }
  };

  // Handle delete transfer history entry
  const handleDeleteTransfer = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this transfer history? This will allow you to re-run the transfer for this month.')) return;

    setDeletingTransfer(logId);
    try {
      const result = await deleteMonthEndSavingsLog(logId);
      if (result.success) {
        setTransferHistory(prev => prev.filter(t => t.id !== logId));
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
      alert('Failed to delete transfer history');
    } finally {
      setDeletingTransfer(null);
    }
  };

  const totalPortfolioValue = useMemo(() => {
    return holdings.reduce((sum, holding) => {
      const price = holding.current_price || holding.average_price;
      const valueInHoldingCurrency = holding.shares * price;
      // Convert to user's profile currency
      const valueInProfileCurrency = convertCurrency(valueInHoldingCurrency, holding.currency || 'USD', profileCurrency);
      return sum + valueInProfileCurrency;
    }, 0);
  }, [holdings, profileCurrency]);

  const totalAssets = useMemo(() => {
    return assets.reduce((sum, asset) => {
      // Convert each asset to user's profile currency
      const valueInProfileCurrency = convertCurrency(asset.amount, asset.currency || 'USD', profileCurrency);
      return sum + valueInProfileCurrency;
    }, 0);
  }, [assets, profileCurrency]);

  const _assetsByType = useMemo(() => {
    const typeTotals: Record<string, number> = {};

    assets.forEach(asset => {
      const valueInProfileCurrency = convertCurrency(
        asset.amount,
        asset.currency || 'USD',
        profileCurrency
      );
      typeTotals[asset.type] = (typeTotals[asset.type] || 0) + valueInProfileCurrency;
    });

    const total = Object.values(typeTotals).reduce((sum, val) => sum + val, 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

    return {
      total,
      types: Object.entries(typeTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }))
    };
  }, [assets, profileCurrency]);

  const assetTypeColors: Record<string, string> = {
    'Cash': 'from-green-500 to-green-600',
    'Bank Account': 'from-blue-500 to-blue-600',
    'Investment': 'from-purple-500 to-purple-600',
    'E-Wallet': 'from-orange-500 to-orange-600',
    'Cryptocurrency': 'from-yellow-500 to-yellow-600',
    'Real Estate': 'from-pink-500 to-pink-600',
    'Vehicle': 'from-indigo-500 to-indigo-600',
    'Other': 'from-slate-500 to-slate-600'
  };

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
      <div className="mb-6 md:mb-8 animate-slide-in-up pl-16 lg:pl-0">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Assets</h1>
        <p className="text-sm md:text-base text-[var(--text-secondary)]">Track all your assets and net worth</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Total Net Worth Card and Add Form */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Total Assets Card */}
          <div className="rounded-2xl p-4 md:p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl animate-scale-in">
            <div className="flex items-center mb-2">
              <TrendingUp className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-semibold">Total Net Worth</h3>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(totalAssets + totalPortfolioValue)}
            </p>
            <p className="text-white text-sm mt-1">
              Assets: {formatCurrency(totalAssets)} + Portfolio: {formatCurrency(totalPortfolioValue)}
            </p>
          </div>

          {/* Add New Asset Form */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Add New Asset</h2>
              
              {/* AI/Manual Toggle */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!isAIMode ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                  Manual
                </span>
                <button
                  onClick={() => setIsAIMode(!isAIMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAIMode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-[var(--card-border)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAIMode ? 'translate-x-6' : 'translate-x-1'
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
                  Just describe your asset naturally, we&apos;ll handle the rest
                </p>
                
                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Try: 'Bank savings $10,000' or 'Crypto wallet 2.5 BTC worth $120k' or 'Emergency fund RM 50000'"
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
                    
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Asset Name</label>
                      <input
                        type="text"
                        value={reviewData.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          setReviewData({ ...reviewData, name: capitalized });
                        }}
                        className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Type</label>
                        <select
                          value={reviewData.type}
                          onChange={(e) => setReviewData({ ...reviewData, type: e.target.value })}
                          className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {defaultAssetTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
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
                          {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
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

                    <button
                      onClick={handleReviewConfirm}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Add Asset
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Asset Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="e.g., Savings Account, Bitcoin Wallet"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Asset Type
                </label>
                {!showCustomType ? (
                  <div className="space-y-2">
                    <select
                      id="type"
                      value={newAsset.type}
                      onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                    >
                      {defaultAssetTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomType(true)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Add custom type
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newAsset.customType}
                      onChange={(e) => setNewAsset({ ...newAsset, customType: e.target.value })}
                      placeholder="Enter custom asset type"
                      className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomType(false);
                        setNewAsset({ ...newAsset, customType: '' });
                      }}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      ← Back to preset types
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                  placeholder="e.g., Emergency fund"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Current Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">{symbol}</span>
                  <input
                    type="number"
                    id="amount"
                    value={newAsset.amount}
                    onChange={(e) => setNewAsset({ ...newAsset, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={newAsset.currency}
                  onChange={(e) => setNewAsset({ ...newAsset, currency: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg liquid-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </button>
            </form>
            )}
          </div>
        </div>

        {/* Assets List Grouped by Type */}
        <div className="lg:col-span-2">
          {/* Portfolio Summary (Synced from Investments) */}
          {totalPortfolioValue > 0 && (
            <div className="glass-card rounded-2xl p-4 md:p-6 mb-4 md:mb-6 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Investment Portfolio</h2>
                  <p className="text-[var(--text-secondary)] text-sm">Synced from Investments page</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(totalPortfolioValue)}
                  </p>
                  <a
                    href="/investments"
                    className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm mt-1 inline-block font-medium transition-colors"
                  >
                    View Details →
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-in-up" style={{ animationDelay: '300ms' }}>
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4 md:mb-6">Your Assets</h2>

            {assets.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">No assets recorded yet. Add your first asset to get started!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedAssets).map(([type, typeAssets]) => {
                  const typeTotal = typeAssets.reduce((sum, asset) => {
                    // Convert each asset to profile currency for the total
                    const valueInProfileCurrency = convertCurrency(asset.amount, asset.currency || 'USD', profileCurrency);
                    return sum + valueInProfileCurrency;
                  }, 0);
                  const gradientClass = assetTypeColors[type] || assetTypeColors['Other'];

                  return (
                    <div key={type}>
                      {/* Type Header */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[var(--text-primary)] font-semibold">{type}</h3>
                        <span className="text-[var(--accent-primary)] text-sm font-medium">
                          {formatCurrency(typeTotal)}
                        </span>
                      </div>

                      {/* Assets for this type */}
                      <div className="space-y-2">
                        {typeAssets.map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => setEditingAsset(asset)}
                            className="flex items-center justify-between p-4 glass-card rounded-xl hover:bg-[var(--card-hover)] hover:scale-102 transition-all duration-300 cursor-pointer"
                          >
                            <div className="flex items-center flex-1">
                              <div className={`p-3 bg-gradient-to-br ${gradientClass} rounded-lg mr-4`}>
                                <Wallet className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-[var(--text-primary)] font-medium">{asset.name}</h3>
                                {asset.description && (
                                  <p className="text-[var(--text-secondary)] text-sm">{asset.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <p className="text-[var(--accent-success)] font-semibold">
                                {formatBy(asset.currency)(asset.amount)}
                              </p>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAsset(asset.id);
                                  }}
                                  disabled={deletingAsset === asset.id}
                                  className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete asset"
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
            )}
          </div>
        </div>
      </div>

      {/* Month-End Savings Transfer History */}
      <div className="mt-6 md:mt-8 glass-card rounded-2xl p-4 md:p-6 animate-slide-in-up" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <History className="h-5 w-5 mr-2 text-[var(--accent-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Month-End Savings Transfers</h2>
          </div>
          <button
            onClick={() => setShowTransferHistory(!showTransferHistory)}
            className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium transition-colors"
          >
            {showTransferHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>

        {showTransferHistory && (
          <div className="space-y-3">
            {transferHistory.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] py-8">
                No transfer history yet. Transfers happen automatically at month end.
              </p>
            ) : (
              transferHistory.map((transfer) => {
                const monthDate = new Date(transfer.month);
                const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const isPositive = transfer.net_balance >= 0;

                return (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--card-hover)] transition-all"
                  >
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-4 ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isPositive ? (
                          <ArrowUpRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{monthLabel}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Income: {formatCurrency(transfer.total_income)} • Expenses: {formatCurrency(transfer.total_expenses)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`font-bold text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(transfer.net_balance)}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {formatCurrency(transfer.saving_asset_previous_amount)} → {formatCurrency(transfer.saving_asset_new_amount)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTransfer(transfer.id)}
                        disabled={deletingTransfer === transfer.id}
                        className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete transfer history"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setEditingAsset(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Asset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Asset Name</label>
                <input
                  type="text"
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Asset Type</label>
                <input
                  type="text"
                  value={editingAsset.type}
                  onChange={(e) => setEditingAsset({ ...editingAsset, type: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                <input
                  type="text"
                  value={editingAsset.description || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Current Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">{getCurrencySymbol((editingAsset as Asset & { currency?: string })?.currency || profileCurrency)}</span>
                  <input
                    type="number"
                    value={editingAsset.amount}
                    onChange={(e) => setEditingAsset({ ...editingAsset, amount: parseFloat(e.target.value) })}
                    step="0.01"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={(editingAsset as Asset & { currency?: string }).currency || profileCurrency}
                  onChange={(e) => setEditingAsset({ ...(editingAsset as Asset & { currency?: string }), currency: e.target.value } as Asset)}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all duration-300"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingAsset(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAsset}
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