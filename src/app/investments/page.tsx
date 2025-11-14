'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, getCurrencySymbol, CURRENCY_OPTIONS } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';

interface Holding {
  id: string;
  symbol: string;
  shares: number;
  average_price: number;
  current_price?: number;
  last_updated?: string;
  currency?: string;
  asset_class?: string;
}

export default function Investments() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('USD'); // Currency toggle for display
  const [userSettings, setUserSettings] = useState<any>(null);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    shares: '',
    average_price: ''
  });

  useEffect(() => {
    if (user) {
      loadHoldings();
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setUserSettings(data);
      setDisplayCurrency(data.currency || 'USD'); // Set default display currency from user settings
    }
  };

  const formatCurrency = getCurrencyFormatter(displayCurrency);

  const loadHoldings = async () => {
    try {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('symbol', { ascending: true });

      if (error) throw error;
      setHoldings(data || []);
      
      // Auto-refresh prices for all holdings
      if (data && data.length > 0) {
        data.forEach(holding => {
          if (!holding.current_price || isStale(holding.last_updated)) {
            fetchStockPrice(holding.id, holding.symbol);
          }
        });
      }
    } catch (error) {
      console.error('Error loading holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isStale = (lastUpdated?: string) => {
    if (!lastUpdated) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - new Date(lastUpdated).getTime() > fiveMinutes;
  };

  const fetchStockPrice = async (holdingId: string, symbol: string) => {
    try {
      setRefreshing(holdingId);
      
      // Use our server-side API to avoid CORS issues
      const response = await fetch(`/api/stock-price?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock price');
      }
      
      const data = await response.json();
      
      if (data.price) {
        await updatePrice(holdingId, data.price);
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      // Don't show error to user, just keep using average price
    } finally {
      setRefreshing(null);
    }
  };

  const updatePrice = async (holdingId: string, currentPrice: number) => {
    // Update in database
    const { error } = await supabase
      .from('holdings')
      .update({
        current_price: currentPrice,
        last_updated: new Date().toISOString()
      })
      .eq('id', holdingId);

    if (error) throw error;

    // Update local state
    setHoldings(prev =>
      prev.map(h =>
        h.id === holdingId
          ? { ...h, current_price: currentPrice, last_updated: new Date().toISOString() }
          : h
      )
    );
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newHolding.symbol && newHolding.shares && newHolding.average_price && user) {
      try {
        const { data, error } = await supabase
          .from('holdings')
          .insert({
            user_id: user.id,
            symbol: newHolding.symbol.toUpperCase(),
            shares: parseFloat(newHolding.shares),
            average_price: parseFloat(newHolding.average_price)
          })
          .select()
          .single();

        if (error) throw error;

        setHoldings([...holdings, data]);
        setNewHolding({ symbol: '', shares: '', average_price: '' });
        setShowAddHolding(false);
        
        // Fetch current price for new holding
        fetchStockPrice(data.id, data.symbol);
      } catch (error) {
        console.error('Error adding holding:', error);
        alert('Failed to add holding');
      }
    }
  };

  const handleUpdateHolding = async () => {
    if (!editingHolding || !user) return;

    try {
      const { error } = await supabase
        .from('holdings')
        .update({
          shares: editingHolding.shares,
          average_price: editingHolding.average_price
        })
        .eq('id', editingHolding.id);

      if (error) throw error;

      setHoldings(holdings.map(h => (h.id === editingHolding.id ? editingHolding : h)));
      setEditingHolding(null);
      
      // Refresh price after update
      fetchStockPrice(editingHolding.id, editingHolding.symbol);
    } catch (error) {
      console.error('Error updating holding:', error);
      alert('Failed to update holding');
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    if (!confirm('Are you sure you want to delete this holding?')) return;

    setDeletingHolding(holdingId);
    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', holdingId);

      if (error) throw error;

      setHoldings(holdings.filter(h => h.id !== holdingId));
    } catch (error) {
      console.error('Error deleting holding:', error);
      alert('Failed to delete holding');
    } finally {
      setDeletingHolding(null);
    }
  };

  const portfolioStats = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => {
      const currentPrice = h.current_price || h.average_price;
      const valueInHoldingCurrency = h.shares * currentPrice;
      // Convert to display currency
      const valueInDisplayCurrency = convertCurrency(valueInHoldingCurrency, h.currency || 'USD', displayCurrency);
      return sum + valueInDisplayCurrency;
    }, 0);

    const totalCost = holdings.reduce((sum, h) => {
      const costInHoldingCurrency = h.shares * h.average_price;
      // Convert to display currency
      const costInDisplayCurrency = convertCurrency(costInHoldingCurrency, h.currency || 'USD', displayCurrency);
      return sum + costInDisplayCurrency;
    }, 0);
    
    const totalGainLoss = totalValue - totalCost;
    const percentageChange = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      percentageChange
    };
  }, [holdings, displayCurrency]);

  // Portfolio allocation by investment type (asset_class)
  const portfolioAllocation = useMemo(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F43F5E', '#14B8A6'];
    const map: Record<string, number> = {};
    for (const h of holdings) {
      const currentPrice = h.current_price || h.average_price;
      const valueInHoldingCurrency = h.shares * currentPrice;
      // Convert to display currency
      const valueInDisplayCurrency = convertCurrency(valueInHoldingCurrency, h.currency || 'USD', displayCurrency);
      const key = (h as any).asset_class || 'stock';
      map[key] = (map[key] || 0) + valueInDisplayCurrency;
    }
    const entries = Object.entries(map).map(([name, value], index) => ({
      name: name.replace('_',' ').toUpperCase(),
      value,
      percentage: portfolioStats.totalValue > 0 ? (value / portfolioStats.totalValue) * 100 : 0,
      color: colors[index % colors.length]
    }));
    return entries.sort((a,b) => b.value - a.value);
  }, [holdings, portfolioStats.totalValue, displayCurrency]);

  // Portfolio performance over last 12 months (simulated based on current holdings)
  const portfolioPerformance = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Simulate historical value (in a real app, this would come from portfolio_snapshots table)
      // For now, we'll show a growth trend based on current value
      const growthFactor = 0.85 + (i * 0.015); // Gradual growth from 85% to 100% of current value
      const monthValue = portfolioStats.totalValue * growthFactor;
      
      data.push({
        month: monthLabel,
        value: Math.round(monthValue * 100) / 100
      });
    }
    
    return data;
  }, [portfolioStats.totalValue]);

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Investments</h1>
          <p className="text-slate-400">Track your stock portfolio with real-time prices</p>
        </div>
        <div className="flex items-center space-x-3">
          <label htmlFor="currency-select" className="text-slate-400 text-sm">Display Currency:</label>
          <select
            id="currency-select"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
          >
            {CURRENCY_OPTIONS.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Total Value</h3>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(portfolioStats.totalValue)}
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Total Cost</h3>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(portfolioStats.totalCost)}
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Gain/Loss</h3>
          <p className={`text-2xl font-bold ${portfolioStats.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {portfolioStats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioStats.totalGainLoss))}
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Return</h3>
          <div className="flex items-center">
            <p className={`text-2xl font-bold ${portfolioStats.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {portfolioStats.percentageChange >= 0 ? '+' : ''}{portfolioStats.percentageChange.toFixed(2)}%
            </p>
            {portfolioStats.percentageChange >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-400 ml-2" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400 ml-2" />
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Allocation Chart */}
      {holdings.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Portfolio Allocation</h2>
          <div className="flex items-center justify-between">
            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {portfolioAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="20" fontWeight="bold">
                    {holdings.length}
                  </text>
                  <text x="50%" y="50%" dy="22" textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize="12">
                    Holdings
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 ml-12 grid grid-cols-2 gap-4">
              {portfolioAllocation.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-white font-medium">{item.name}</span>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-white font-semibold">{formatCurrency(item.value)}</div>
                    <div className="text-slate-400 text-xs">({item.percentage.toFixed(1)}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Performance Chart */}
      {holdings.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Portfolio Performance (Last 12 Months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioPerformance}>
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
                  formatter={(value: any) => [formatCurrency(value), 'Portfolio Value']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-slate-400 text-xs mt-4 text-center">
            * Performance data is simulated based on current holdings. For accurate historical tracking, portfolio snapshots will be recorded monthly.
          </p>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Holdings</h2>
          <button
            onClick={() => setShowAddHolding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Holding
          </button>
        </div>

        {holdings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No holdings yet. Add your first stock to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium pb-3">Symbol</th>
                  <th className="text-right text-slate-400 font-medium pb-3">Shares</th>
                  <th className="text-right text-slate-400 font-medium pb-3">Avg Price</th>
                  <th className="text-right text-slate-400 font-medium pb-3">Current Price</th>
                  <th className="text-right text-slate-400 font-medium pb-3">Total Value</th>
                  <th className="text-right text-slate-400 font-medium pb-3">Gain/Loss</th>
                  <th className="text-right text-slate-400 font-medium pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const currentPrice = holding.current_price || holding.average_price;
                  const totalValue = holding.shares * currentPrice;
                  const totalCost = holding.shares * holding.average_price;
                  const gainLoss = totalValue - totalCost;
                  const gainLossPercent = (gainLoss / totalCost) * 100;
                  
                  // Use holding's own currency, not the display currency
                  const holdingCurrency = holding.currency || 'USD';
                  const formatHoldingCurrency = getCurrencyFormatter(holdingCurrency);

                  return (
                    <tr 
                      key={holding.id} 
                      onClick={() => setEditingHolding(holding)}
                      className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 text-white font-medium">{holding.symbol}</td>
                      <td className="py-4 text-right text-slate-300">{holding.shares}</td>
                      <td className="py-4 text-right text-slate-300">{formatHoldingCurrency(holding.average_price)}</td>
                      <td className="py-4 text-right text-white">
                        <div className="flex items-center justify-end">
                          {formatHoldingCurrency(currentPrice)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchStockPrice(holding.id, holding.symbol);
                            }}
                            disabled={refreshing === holding.id}
                            className="ml-2 p-1 text-slate-400 hover:text-blue-400 disabled:opacity-50"
                            title="Refresh price"
                          >
                            <RefreshCw className={`h-3 w-3 ${refreshing === holding.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-right text-white font-medium">{formatHoldingCurrency(totalValue)}</td>
                      <td className={`py-4 text-right font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gainLoss >= 0 ? '+' : ''}{formatHoldingCurrency(Math.abs(gainLoss))}
                        <span className="text-sm ml-1">({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)</span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHolding(holding.id);
                            }}
                            disabled={deletingHolding === holding.id}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete holding"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Holding Modal */}
      {showAddHolding && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddHolding(false)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add New Holding</h3>

            <form onSubmit={handleAddHolding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Instrument Type</label>
                <select
                  value={newHolding.asset_class}
                  onChange={(e) => setNewHolding({ ...newHolding, asset_class: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['stock','crypto','bond','etf','mutual_fund','real_estate','commodities'].map((t) => (
                    <option key={t} value={t}>{t.replace('_',' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {newHolding.asset_class === 'crypto' ? 'Crypto Symbol/Pair' : 'Symbol/Identifier'}
                </label>
                <input
                  type="text"
                  value={newHolding.symbol}
                  onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value.toUpperCase() })}
                  placeholder={newHolding.asset_class === 'crypto' ? 'e.g., BTC-USD, ETH-USD' : 'e.g., AAPL, VTI, GLD'}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Number of Shares</label>
                <input
                  type="number"
                  value={newHolding.shares}
                  onChange={(e) => setNewHolding({ ...newHolding, shares: e.target.value })}
                  placeholder="0"
                  step="0.001"
                  min="0"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Average Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={newHolding.average_price}
                    onChange={(e) => setNewHolding({ ...newHolding, average_price: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <select
                  value={newHolding.currency}
                  onChange={(e) => setNewHolding({ ...newHolding, currency: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddHolding(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holding Modal */}
      {editingHolding && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditingHolding(null)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Edit Holding</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Stock Symbol</label>
                <input
                  type="text"
                  value={editingHolding.symbol}
                  disabled
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Symbol cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Number of Shares</label>
                <input
                  type="number"
                  value={editingHolding.shares}
                  onChange={(e) => setEditingHolding({ ...editingHolding, shares: parseFloat(e.target.value) })}
                  step="0.001"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Average Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={editingHolding.average_price}
                    onChange={(e) => setEditingHolding({ ...editingHolding, average_price: parseFloat(e.target.value) })}
                    step="0.01"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingHolding(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHolding}
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
