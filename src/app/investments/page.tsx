'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Trash2, RefreshCw, History, Calendar, Edit2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, CURRENCY_OPTIONS } from '@/lib/currency';
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

interface Transaction {
  id: string;
  holding_id: string;
  transaction_type: 'BUY' | 'SELL';
  shares: number;
  price_per_share: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

export default function Investments() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [deletingHolding, setDeletingHolding] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const _userSettings = useState<{ currency?: string; [key: string]: unknown } | null>(null)[0];
  const [monthlyStats, setMonthlyStats] = useState<Array<{ month: string; total_net_worth?: number; total_portfolio_value?: number }>>([]);
  const [historicalPrices, setHistoricalPrices] = useState<Record<string, number>>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newHolding, setNewHolding] = useState<{
    symbol: string;
    shares: string;
    average_price: string;
    asset_class: string;
    currency: string;
    purchase_date: string;
  }>({
    symbol: '',
    shares: '',
    average_price: '',
    asset_class: 'stock',
    currency: 'USD',
    purchase_date: new Date().toISOString().split('T')[0]
  });

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setDisplayCurrency(data.currency || 'USD'); // Set default display currency from user settings
    }
  };

  const loadMonthlyStats = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('monthly_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: true });
      if (!error && data) {
        setMonthlyStats(data);
      }
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('holding_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });
      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // Fetch historical prices for portfolio chart
  const loadHistoricalPrices = async () => {
    if (holdings.length === 0) return;

    const now = new Date();
    const pricesCache: Record<string, number> = { ...historicalPrices };

    // Fetch prices for past 11 months (not current month - we use live prices)
    for (let i = 1; i <= 11; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // API expects 1-indexed month

      for (const holding of holdings) {
        const cacheKey = `${holding.symbol}-${year}-${month}`;

        // Skip if already cached
        if (pricesCache[cacheKey] !== undefined) continue;

        try {
          const response = await fetch(`/api/historical-price?symbol=${holding.symbol}&year=${year}&month=${month}`);
          if (response.ok) {
            const data = await response.json();
            if (data.price) {
              pricesCache[cacheKey] = data.price;
            }
          }
        } catch (error) {
          console.error(`Error fetching historical price for ${holding.symbol}:`, error);
        }
      }
    }

    setHistoricalPrices(pricesCache);
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

  // Load historical prices when holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      loadHistoricalPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings]);

  useEffect(() => {
    if (user) {
      loadHoldings();
      loadSettings();
      loadMonthlyStats();
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      const symbol = newHolding.symbol.toUpperCase();
      const newShares = parseFloat(newHolding.shares);
      const newPrice = parseFloat(newHolding.average_price);

      try {
        // Check if holding with same symbol already exists
        const existingHolding = holdings.find(h => h.symbol.toUpperCase() === symbol);

        let holdingId: string;

        if (existingHolding) {
          // Calculate new average price and total shares
          const totalShares = existingHolding.shares + newShares;
          const totalCost = (existingHolding.shares * existingHolding.average_price) + (newShares * newPrice);
          const newAvgPrice = totalCost / totalShares;

          // Update existing holding
          const { error } = await supabase
            .from('holdings')
            .update({
              shares: totalShares,
              average_price: newAvgPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingHolding.id);

          if (error) {
            alert(`Failed to update holding: ${error.message}`);
            return;
          }

          holdingId = existingHolding.id;

          // Update local state
          setHoldings(holdings.map(h =>
            h.id === existingHolding.id
              ? { ...h, shares: totalShares, average_price: newAvgPrice }
              : h
          ));
        } else {
          // Create new holding
          const { data, error } = await supabase
            .from('holdings')
            .insert({
              user_id: user.id,
              symbol: symbol,
              shares: newShares,
              average_price: newPrice,
              currency: newHolding.currency,
              asset_class: newHolding.asset_class
            })
            .select()
            .single();

          if (error) {
            alert(`Failed to add holding: ${error.message}`);
            return;
          }

          holdingId = data.id;
          setHoldings([...holdings, data]);

          // Fetch current price for new holding
          fetchStockPrice(data.id, data.symbol);
        }

        // Create the transaction record
        const { error: txError } = await supabase
          .from('holding_transactions')
          .insert({
            user_id: user.id,
            holding_id: holdingId,
            transaction_type: 'BUY',
            shares: newShares,
            price_per_share: newPrice,
            transaction_date: newHolding.purchase_date
          });

        if (txError) {
          console.error('Error creating transaction:', txError);
        } else {
          loadTransactions();
        }

        // Reset form
        setNewHolding({
          symbol: '',
          shares: '',
          average_price: '',
          asset_class: 'stock',
          currency: 'USD',
          purchase_date: new Date().toISOString().split('T')[0]
        });
        setShowAddHolding(false);

      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error adding holding:', error);
        alert(`Failed to add holding: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  // Holdings are now read-only - clicking a holding shows its transactions instead
  // This function recalculates a holding's shares and average from its transactions
  const recalculateHolding = async (holdingId: string, txList?: Transaction[]) => {
    // Use provided txList or fall back to current state
    const allTransactions = txList || transactions;
    const holdingTransactions = allTransactions.filter(t => t.holding_id === holdingId);

    // Calculate total shares (BUY - SELL)
    let totalShares = 0;
    let totalBuyCost = 0;
    let totalBuyShares = 0;

    holdingTransactions.forEach(tx => {
      if (tx.transaction_type === 'BUY') {
        totalShares += tx.shares;
        totalBuyCost += tx.shares * tx.price_per_share;
        totalBuyShares += tx.shares;
      } else {
        totalShares -= tx.shares;
      }
    });

    const avgPrice = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;

    // Update the holding in database
    const { error } = await supabase
      .from('holdings')
      .update({
        shares: Math.max(totalShares, 0),
        average_price: avgPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', holdingId);

    if (error) {
      console.error('Error recalculating holding:', error);
      return;
    }

    // Update local state using functional form to avoid stale state
    setHoldings(prevHoldings =>
      prevHoldings.map(h =>
        h.id === holdingId
          ? { ...h, shares: Math.max(totalShares, 0), average_price: avgPrice }
          : h
      )
    );
  };

  const handleDeleteHolding = async (holdingId: string) => {
    const txCount = transactions.filter(t => t.holding_id === holdingId).length;
    const message = txCount > 0
      ? `This will delete the holding and ${txCount} transaction(s). Are you sure?`
      : 'Are you sure you want to delete this holding?';

    if (!confirm(message)) return;

    setDeletingHolding(holdingId);
    try {
      // Transactions will be cascade deleted due to FK constraint
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', holdingId);

      if (error) throw error;

      setHoldings(holdings.filter(h => h.id !== holdingId));
      setTransactions(transactions.filter(t => t.holding_id !== holdingId));
    } catch (error) {
      console.error('Error deleting holding:', error);
      alert('Failed to delete holding');
    } finally {
      setDeletingHolding(null);
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('holding_transactions')
        .update({
          shares: editingTransaction.shares,
          price_per_share: editingTransaction.price_per_share,
          transaction_date: editingTransaction.transaction_date,
          transaction_type: editingTransaction.transaction_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      // Create updated transactions list with the edited transaction
      const updatedTransactions = transactions.map(t =>
        t.id === editingTransaction.id ? editingTransaction : t
      );

      // Update local transactions state
      setTransactions(updatedTransactions);

      // Recalculate the parent holding using the fresh transactions data
      await recalculateHolding(editingTransaction.holding_id, updatedTransactions);

      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: string, holdingId: string) => {
    if (!confirm('Delete this transaction? The holding will be recalculated.')) return;

    try {
      const { error } = await supabase
        .from('holding_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Update local state first
      const newTransactions = transactions.filter(t => t.id !== transactionId);
      setTransactions(newTransactions);

      // Check if holding has any remaining transactions
      const remainingTx = newTransactions.filter(t => t.holding_id === holdingId);

      if (remainingTx.length === 0) {
        // No transactions left - delete the holding
        await supabase.from('holdings').delete().eq('id', holdingId);
        setHoldings(holdings.filter(h => h.id !== holdingId));
      } else {
        // Recalculate holding from remaining transactions - pass newTransactions to use fresh data
        await recalculateHolding(holdingId, newTransactions);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const getTransactionsForHolding = (holdingId: string) => {
    return transactions.filter(t => t.holding_id === holdingId);
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
      // Derive asset class with sensible default so crypto isn't lost
      let key = (h as Holding & { asset_class?: string }).asset_class;
      if (!key) {
        const symbol = (h.symbol || '').toUpperCase();
        // Heuristic: treat symbols like BTC-USD / ETH-USD as crypto
        key = symbol.includes('-') ? 'crypto' : 'stock';
      }
      map[key] = (map[key] || 0) + valueInDisplayCurrency;
    }
    const entries = Object.entries(map).map(([name, value], index) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
      percentage: portfolioStats.totalValue > 0 ? (value / portfolioStats.totalValue) * 100 : 0,
      color: colors[index % colors.length]
    }));
    return entries.sort((a, b) => b.value - a.value);
  }, [holdings, displayCurrency]);

  // Portfolio performance over last 12 months
  // Strategy: Calculate portfolio value at each month-end based on:
  // 1. Shares held at that point (cumulative transactions up to month-end)
  // 2. Use monthly_stats if available, otherwise use average_price as fallback
  const portfolioPerformance = useMemo(() => {
    const data = [];
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Build a map of monthly stats for quick lookup
    const statsMap = new Map<string, number>();
    monthlyStats.forEach(stat => {
      const monthDate = new Date(stat.month);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      statsMap.set(monthKey, stat.total_portfolio_value || 0);
    });

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      let monthPortfolioValue: number;

      if (monthKey === currentMonthKey) {
        // Current month: calculate live from current holdings
        monthPortfolioValue = holdings.reduce((sum, h) => {
          const currentPrice = h.current_price || h.average_price;
          const valueInHoldingCurrency = h.shares * currentPrice;
          return sum + convertCurrency(valueInHoldingCurrency, h.currency || 'USD', displayCurrency);
        }, 0);
      } else if (statsMap.has(monthKey)) {
        // Past month with recorded monthly_stats - use them
        monthPortfolioValue = statsMap.get(monthKey)!;
      } else {
        // Past month without stats - calculate based on transactions at that point
        // Group shares by holding at month-end
        const sharesAtMonthEnd = new Map<string, { shares: number; symbol: string; currency: string }>();

        // Initialize all holdings
        holdings.forEach(h => {
          sharesAtMonthEnd.set(h.id, {
            shares: 0,
            symbol: h.symbol,
            currency: h.currency || 'USD'
          });
        });

        // Process transactions up to this month-end
        transactions.forEach(tx => {
          const txDate = new Date(tx.transaction_date);
          if (txDate <= monthEnd) {
            const data = sharesAtMonthEnd.get(tx.holding_id);
            if (data) {
              if (tx.transaction_type === 'BUY') {
                data.shares += tx.shares;
              } else {
                data.shares -= tx.shares;
              }
            }
          }
        });

        // Calculate portfolio value using shares at month-end × historical price
        monthPortfolioValue = 0;
        sharesAtMonthEnd.forEach((data) => {
          if (data.shares > 0) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const priceKey = `${data.symbol}-${year}-${month}`;

            // Use historical price if available, otherwise fall back to current holding's price
            const holding = holdings.find(h => h.symbol === data.symbol);
            const historicalPrice = historicalPrices[priceKey];
            const price = historicalPrice || (holding?.average_price || 0);

            const valueInHoldingCurrency = data.shares * price;
            monthPortfolioValue += convertCurrency(valueInHoldingCurrency, data.currency, displayCurrency);
          }
        });
      }

      data.push({
        month: monthLabel,
        value: Math.round(monthPortfolioValue * 100) / 100
      });
    }

    return data;
  }, [portfolioStats.totalValue, monthlyStats, holdings, transactions, displayCurrency, historicalPrices]);

  if (loading) {
    return (
      <div className="p-6 bg-[var(--background)] min-h-screen transition-colors duration-300 flex items-center justify-center">
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
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Investments</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">Track your stock portfolio with real-time prices</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <label htmlFor="currency-select" className="text-[var(--text-secondary)] text-xs sm:text-sm">Display Currency:</label>
          <select
            id="currency-select"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="glass-card border border-[var(--card-border)] rounded-xl px-4 py-2 text-[var(--text-primary)] bg-[var(--background-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] pr-12"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
          <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-2">Total Value</h3>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(portfolioStats.totalValue)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 animate-scale-in">
          <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-2">Total Cost</h3>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(portfolioStats.totalCost)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 animate-scale-in">
          <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-2">Gain/Loss</h3>
          <p className={`text-2xl font-bold ${portfolioStats.totalGainLoss >= 0 ? 'text-[var(--accent-success)]' : 'text-red-400'}`}>
            {portfolioStats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioStats.totalGainLoss))}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 animate-scale-in">
          <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-2">Return</h3>
          <div className="flex items-center">
            <p className={`text-2xl font-bold ${portfolioStats.percentageChange >= 0 ? 'text-[var(--accent-success)]' : 'text-red-400'}`}>
              {portfolioStats.percentageChange >= 0 ? '+' : ''}{portfolioStats.percentageChange.toFixed(2)}%
            </p>
            {portfolioStats.percentageChange >= 0 ? (
              <TrendingUp className="h-5 w-5 text-[var(--accent-success)] ml-2" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400 ml-2" />
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Allocation + Performance (1:2 layout) */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Portfolio Allocation - 1/3 width */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in xl:col-span-1">
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4 md:mb-6">Portfolio Allocation</h2>
            <div className="flex flex-col items-center">
              <div className="w-56 h-56">
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
                      stroke="none"
                    >
                      {portfolioAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="var(--text-primary)"
                      fontSize="20"
                      fontWeight="bold"
                    >
                      {holdings.length}
                    </text>
                    <text
                      x="50%"
                      y="50%"
                      dy="22"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="var(--text-secondary)"
                      fontSize="12"
                    >
                      Holdings
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 w-full space-y-3">
                {portfolioAllocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-[var(--text-primary)] text-sm font-medium truncate">{item.name}</span>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-[var(--text-primary)] text-sm font-semibold">{formatCurrency(item.value)}</div>
                      <div className="text-[var(--text-secondary)] text-xs">({item.percentage.toFixed(1)}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Performance - 2/3 width */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in xl:col-span-2">
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4 md:mb-6">Portfolio Performance (Last 12 Months)</h2>
            <div className="h-48 sm:h-64">
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
                    formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
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
            <p className="text-[var(--text-secondary)] text-xs mt-4 text-center">
              * Past months use recorded snapshots. Current month shows real-time value.
            </p>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Holdings</h2>
        </div>

        {holdings.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <p className="text-sm md:text-base text-[var(--text-secondary)]">No holdings yet. Add your first stock to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-[var(--text-secondary)] font-medium pb-3">Symbol</th>
                  <th className="text-right text-[var(--text-secondary)] font-medium pb-3">Shares</th>
                  <th className="text-right text-[var(--text-secondary)] font-medium pb-3">Avg Price</th>
                  <th className="text-right text-[var(--text-secondary)] font-medium pb-3">Current Price</th>
                  <th className="text-right text-[var(--text-secondary)] font-medium pb-3">Total Value</th>
                  <th className="text-right text-[var(--text-secondary)] font-medium pb-3">Gain/Loss</th>
                  <th className="text-right text-[var(--text-secondary)] font-medium pb-3">Actions</th>
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
                      className="border-b border-[var(--card-border)] last:border-b-0 hover:bg-[var(--card-hover)] transition-colors"
                    >
                      <td className="py-4 text-[var(--text-primary)] font-medium">{holding.symbol}</td>
                      <td className="py-4 text-right text-[var(--text-secondary)]">{holding.shares}</td>
                      <td className="py-4 text-right text-[var(--text-secondary)]">{formatHoldingCurrency(holding.average_price)}</td>
                      <td className="py-4 text-right text-[var(--text-primary)]">
                        <div className="flex items-center justify-end">
                          {formatHoldingCurrency(currentPrice)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchStockPrice(holding.id, holding.symbol);
                            }}
                            disabled={refreshing === holding.id}
                            className="ml-2 p-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] disabled:opacity-50"
                            title="Refresh price"
                          >
                            <RefreshCw className={`h-3 w-3 ${refreshing === holding.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-right text-[var(--text-primary)] font-medium">{formatHoldingCurrency(totalValue)}</td>
                      <td className={`py-4 text-right font-medium ${gainLoss >= 0 ? 'text-[var(--accent-success)]' : 'text-red-400'}`}>
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
                            className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
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

      {/* Transaction History Section */}
      {holdings.length > 0 && (
        <div className="glass-card rounded-2xl p-4 md:p-6 mt-4 md:mt-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center">
              <History className="h-5 w-5 mr-2 text-[var(--accent-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transaction History</h2>
            </div>
            <button
              onClick={() => setShowAddHolding(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 md:px-4 rounded-lg transition-colors flex items-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="md:hidden">Add</span>
              <span className="hidden md:inline">Add Transaction</span>
            </button>
          </div>

          <div className="space-y-6">
            {holdings.map(holding => {
              const holdingTransactions = getTransactionsForHolding(holding.id);
              if (holdingTransactions.length === 0) return null;

              // Use the holding's currency for purchase prices
              const holdingCurrency = holding.currency || 'USD';
              const formatHoldingCurrency = getCurrencyFormatter(holdingCurrency);

              return (
                <div key={holding.id} className="border-b border-[var(--card-border)] pb-4 last:border-b-0">
                  <h3 className="text-[var(--text-primary)] font-medium mb-3">{holding.symbol}</h3>
                  <div className="space-y-2">
                    {holdingTransactions.map(tx => {
                      // Transaction amount in display currency
                      const txAmountInHoldingCurrency = tx.shares * tx.price_per_share;
                      const txAmountInDisplayCurrency = convertCurrency(txAmountInHoldingCurrency, holdingCurrency, displayCurrency);

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors"
                        >
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${tx.transaction_type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              <span className={`text-sm font-bold ${tx.transaction_type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                                {tx.transaction_type}
                              </span>
                            </div>
                            <div>
                              <p className="text-[var(--text-primary)] font-medium">
                                {tx.shares} shares @ {formatHoldingCurrency(tx.price_per_share)}
                              </p>
                              <p className="text-[var(--text-secondary)] text-sm flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(tx.transaction_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-[var(--text-primary)] font-medium">
                              {formatCurrency(txAmountInDisplayCurrency)}
                            </span>
                            <button
                              onClick={() => setEditingTransaction(tx)}
                              className="p-2 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit transaction"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(tx.id, holding.id)}
                              className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddHolding && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddHolding(false)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add New Transaction</h3>

            <form onSubmit={handleAddHolding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Asset Type</label>
                <select
                  value={newHolding.asset_class}
                  onChange={(e) => setNewHolding({ ...newHolding, asset_class: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['stock', 'crypto', 'bond', 'etf', 'mutual_fund', 'commodities'].map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  {newHolding.asset_class === 'crypto' ? 'Crypto Symbol/Pair' : 'Symbol/Identifier'}
                </label>
                <input
                  type="text"
                  value={newHolding.symbol}
                  onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value.toUpperCase() })}
                  placeholder={newHolding.asset_class === 'crypto' ? 'e.g., BTC-USD, ETH-USD' : 'e.g., AAPL, VTI, GLD'}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Number of Shares</label>
                <input
                  type="number"
                  value={newHolding.shares}
                  onChange={(e) => setNewHolding({ ...newHolding, shares: e.target.value })}
                  placeholder="0"
                  step="0.001"
                  min="0"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Average Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={newHolding.average_price}
                    onChange={(e) => setNewHolding({ ...newHolding, average_price: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-8 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={newHolding.currency}
                  onChange={(e) => setNewHolding({ ...newHolding, currency: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Purchase Date</label>
                <input
                  type="date"
                  value={newHolding.purchase_date}
                  onChange={(e) => setNewHolding({ ...newHolding, purchase_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddHolding(false)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingTransaction(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Transaction</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Transaction Type</label>
                <select
                  value={editingTransaction.transaction_type}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, transaction_type: e.target.value as 'BUY' | 'SELL' })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Number of Shares</label>
                <input
                  type="number"
                  value={editingTransaction.shares}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, shares: parseFloat(e.target.value) })}
                  step="0.001"
                  min="0"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Price per Share</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={editingTransaction.price_per_share}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, price_per_share: parseFloat(e.target.value) })}
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-8 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Transaction Date</label>
                <input
                  type="date"
                  value={editingTransaction.transaction_date}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, transaction_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTransaction}
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
