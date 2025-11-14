'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Wallet, Edit2, Trash2, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';

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
  const [userSettings, setUserSettings] = useState<any>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);
  const [showCustomType, setShowCustomType] = useState(false);

  useEffect(() => {
    if (user) {
      loadAssets();
      loadSettings();
      loadHoldings();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    if (data) {
      setUserSettings(data);
      setNewAsset(prev => ({ ...prev, currency: data.currency || 'USD' }));
    }
  };

  const profileCurrency = userSettings?.currency || 'USD';
  const formatBy = (code?: string) => getCurrencyFormatter(code || profileCurrency);
  const formatCurrency = getCurrencyFormatter(profileCurrency);
  const symbol = getCurrencySymbol(newAsset.currency || profileCurrency);

  const loadHoldings = async () => {
    try {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setHoldings((data || []) as Holding[]);
    } catch (e) {
      console.error('Error loading holdings:', e);
    }
  };

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate assets by type for pie chart
  const assetsByType = useMemo(() => {
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
      <div className="p-6 bg-slate-800 min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Assets</h1>
        <p className="text-slate-400">Track all your assets and net worth</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Total Net Worth Card and Add Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Total Assets Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center mb-2">
              <TrendingUp className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-semibold">Total Net Worth</h3>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(totalAssets + totalPortfolioValue)}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              Assets: {formatCurrency(totalAssets)} + Portfolio: {formatCurrency(totalPortfolioValue)}
            </p>
          </div>

          {/* Add New Asset Form */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-6">Add New Asset</h2>
            
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  Asset Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="e.g., Savings Account, Bitcoin Wallet"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-2">
                  Asset Type
                </label>
                {!showCustomType ? (
                  <div className="space-y-2">
                    <select
                      id="type"
                      value={newAsset.type}
                      onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomType(false);
                        setNewAsset({ ...newAsset, customType: '' });
                      }}
                      className="text-sm text-slate-400 hover:text-slate-300"
                    >
                      ← Back to preset types
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                  placeholder="e.g., Emergency fund"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
                  Current Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">{symbol}</span>
                  <input
                    type="number"
                    id="amount"
                    value={newAsset.amount}
                    onChange={(e) => setNewAsset({ ...newAsset, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-14 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <select
                  value={newAsset.currency as any}
                  onChange={(e) => setNewAsset({ ...newAsset, currency: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </button>
            </form>
          </div>
        </div>

        {/* Assets List Grouped by Type */}
        <div className="lg:col-span-3">
          {/* Portfolio Summary (Synced from Investments) */}
          {totalPortfolioValue > 0 && (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">Investment Portfolio</h2>
                  <p className="text-slate-400 text-sm">Synced from Investments page</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(totalPortfolioValue)}
                  </p>
                  <a 
                    href="/investments" 
                    className="text-blue-400 hover:text-blue-300 text-sm mt-1 inline-block"
                  >
                    View Details →
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-6">Your Assets</h2>
            
            {assets.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No assets recorded yet. Add your first asset to get started!</p>
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
                        <h3 className="text-white font-semibold">{type}</h3>
                        <span className="text-blue-400 text-sm font-medium">
                          {formatCurrency(typeTotal)}
                        </span>
                      </div>
                      
                      {/* Assets for this type */}
                      <div className="space-y-2">
                        {typeAssets.map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => setEditingAsset(asset)}
                            className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center flex-1">
                              <div className={`p-3 bg-gradient-to-br ${gradientClass} rounded-lg mr-4`}>
                                <Wallet className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-white font-medium">{asset.name}</h3>
                                {asset.description && (
                                  <p className="text-slate-400 text-sm">{asset.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <p className="text-white font-semibold">
                                {formatBy(asset.currency)(asset.amount)}
                              </p>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAsset(asset.id);
                                  }}
                                  disabled={deletingAsset === asset.id}
                                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
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

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditingAsset(null)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Edit Asset</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Asset Name</label>
                <input
                  type="text"
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Asset Type</label>
                <input
                  type="text"
                  value={editingAsset.type}
                  onChange={(e) => setEditingAsset({ ...editingAsset, type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <input
                  type="text"
                  value={editingAsset.description || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Current Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">{getCurrencySymbol((editingAsset as any)?.currency || profileCurrency)}</span>
                  <input
                    type="number"
                    value={editingAsset.amount}
                    onChange={(e) => setEditingAsset({ ...editingAsset, amount: parseFloat(e.target.value) })}
                    step="0.01"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-14 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <select
                  value={(editingAsset as any).currency || profileCurrency}
                  onChange={(e) => setEditingAsset({ ...(editingAsset as any), currency: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingAsset(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAsset}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
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