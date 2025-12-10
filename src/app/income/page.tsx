'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, DollarSign, Briefcase, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';

interface Income {
  id: string;
  amount: number;
  source: string;
  description?: string;
  date: string;
  currency?: string;
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
  const [newIncome, setNewIncome] = useState({
    source: 'Salary',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD'
  });
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<{ currency?: string; [key: string]: unknown } | null>(null);

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
            date: newIncome.date
          })
          .select()
          .single();

        if (error) throw error;

        setIncome([data, ...income]);
        setNewIncome({
          source: 'Salary',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          currency: userSettings?.currency || 'USD'
        });
      } catch (error) {
        console.error('Error adding income:', error);
        alert('Failed to add income');
      }
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('Are you sure you want to delete this income?')) return;
    
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
          currency: (editingIncome as Income & { currency?: string }).currency || profileCurrency
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
    <div className="p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-8 flex animate-slide-in-up items-center justify-between animate-slide-in-up">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Income</h1>
          <p className="text-[var(--text-secondary)]">Track all your income sources</p>
        </div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          showAllOption={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Total Income Card and Add Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Total Income Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
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
          <div className="glass-card rounded-2xl p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Add New Income</h2>
            
            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Source
                </label>
                <select
                  id="source"
                  value={newIncome.source}
                  onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value })}
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
                <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  value={newIncome.description}
                  onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                  placeholder="e.g., Monthly salary"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
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
          </div>
        </div>

        {/* Income List Grouped by Month/Day */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Income History</h2>
            
            {income.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">No income recorded yet. Add your first income to get started!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedIncome).map(([month, days]) => (
                  <div key={month}>
                    {/* Month Header */}
                    <h3 className="text-[var(--text-primary)] font-semibold mb-4 sticky top-0 py-2">{month}</h3>
                    
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
                                        handleDeleteIncome(inc.id);
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

      {/* Edit Income Modal */}
      {editingIncome && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingIncome(null)}
        >
          <div 
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
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
                  {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
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
