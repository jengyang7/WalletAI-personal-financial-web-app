'use client';

import { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Car, Home, Gamepad2, Utensils, User, HelpCircle, Edit2, Trash2 } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { CATEGORY_OPTIONS } from '@/constants/categories';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter, getCurrencySymbol } from '@/lib/currency';

const getBudgetIcon = (iconType: string) => {
  const lowerType = iconType.toLowerCase();
  
  if (lowerType.includes('food') || lowerType.includes('dining')) {
    return Utensils;
  } else if (lowerType.includes('groceries')) {
    return ShoppingCart;
  } else if (lowerType.includes('transport')) {
    return Car;
  } else if (lowerType.includes('entertainment')) {
    return Gamepad2;
  } else if (lowerType.includes('shopping')) {
    return ShoppingCart;
  } else if (lowerType.includes('utilities')) {
    return Home;
  } else if (lowerType.includes('healthcare') || lowerType.includes('health')) {
    return User;
  } else if (lowerType.includes('housing') || lowerType.includes('rent')) {
    return Home;
  } else if (lowerType.includes('personal')) {
    return User;
  } else {
    return HelpCircle;
  }
};

const getProgressBarColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-blue-500';
};

export default function Budget() {
  const { budgets, expenses, reloadBudgets } = useFinance();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
  const [newBudget, setNewBudget] = useState({
    category: '',
    allocated_amount: ''
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [userSettings, setUserSettings] = useState<any>(null);

  useEffect(() => {
    // Use master category list instead of deriving from expenses
    setAvailableCategories(CATEGORY_OPTIONS);
    if (!newBudget.category && CATEGORY_OPTIONS.length > 0) {
      setNewBudget(prev => ({ ...prev, category: CATEGORY_OPTIONS[0] }));
    }
  }, []);

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
        setNewBudget(prev => ({ ...(prev as any), currency: data.currency || 'USD' }));
      }
    };
    loadSettings();
  }, [user]);

  const profileCurrency = userSettings?.currency || 'USD';
  const formatCurrency = getCurrencyFormatter(profileCurrency);
  const formatBy = (code?: string) => getCurrencyFormatter(code || profileCurrency);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBudget.category && newBudget.allocated_amount && user) {
      try {
        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            name: newBudget.category,
            category: newBudget.category,
            allocated_amount: parseFloat(newBudget.allocated_amount),
            currency: (newBudget as any).currency || userSettings?.currency || 'USD'
          });

        if (error) throw error;

        setNewBudget({ category: availableCategories[0] || '', allocated_amount: '' });
        setShowAddBudget(false);
        await reloadBudgets();
      } catch (error) {
        console.error('Error adding budget:', error);
        alert('Failed to add budget');
      }
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget || !user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          name: editingBudget.category,
          category: editingBudget.category,
          allocated_amount: editingBudget.allocated_amount,
          currency: (editingBudget as any).currency || (newBudget as any).currency || userSettings?.currency || 'USD'
        })
        .eq('id', editingBudget.id);

      if (error) throw error;

      setEditingBudget(null);
      await reloadBudgets();
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update budget');
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    setDeletingBudget(budgetId);
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;
      await reloadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    } finally {
      setDeletingBudget(null);
    }
  };

  return (
    <div className="p-6 bg-slate-800 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Budgets</h1>
          <p className="text-slate-400">Manage your spending with personalized budgets.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label htmlFor="budget-month" className="text-slate-400 text-sm">Select Month:</label>
          <select
            id="budget-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-4 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        </div>
      </div>


      <div className="space-y-4">
          {budgets.length === 0 ? (
            <div className="bg-slate-900 rounded-xl p-12 border border-slate-700 text-center">
              <p className="text-slate-400">No budgets set yet. Add a budget to start tracking your spending!</p>
            </div>
          ) : (
            budgets.map((budget) => {
              const IconComponent = getBudgetIcon(budget.category.toLowerCase());
              // Filter expenses for the selected month and this category
              const monthSpent = expenses
                .filter((e) => {
                  const d = new Date(e.date);
                  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  return ym === selectedMonth && e.category === budget.category;
                })
                .reduce((sum, e) => sum + e.amount, 0);
              const percentage = budget.allocated_amount > 0 ? Math.round((monthSpent / budget.allocated_amount) * 100) : 0;
              const remaining = budget.allocated_amount - monthSpent;
              
              return (
                <div
                  key={budget.id}
                  onClick={() => setEditingBudget(budget)}
                  className="bg-slate-900 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center flex-1">
                      <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                        <IconComponent className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{budget.category}</h3>
                        <p className="text-slate-400 text-sm">
                          Remaining: {formatBy(budget.currency)(remaining)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{percentage}%</div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBudget(budget.id);
                          }}
                          disabled={deletingBudget === budget.id}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete budget"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>{formatBy(budget.currency)(monthSpent)} spent</span>
                    <span>{formatBy(budget.currency)(budget.allocated_amount)} budget</span>
                  </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

        {/* Add New Budget Button */}
        <button
          onClick={() => setShowAddBudget(true)}
          className="w-full bg-slate-900 border-2 border-dashed border-slate-600 rounded-xl p-6 text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Budget
        </button>
      </div>

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddBudget(false)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add New Budget</h3>
            
            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category (from your expenses)
                </label>
                {availableCategories.length > 0 ? (
                  <select
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-slate-400 text-sm">No expense categories available. Add some expenses first!</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monthly Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={newBudget.allocated_amount}
                    onChange={(e) => setNewBudget({ ...newBudget, allocated_amount: e.target.value })}
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
                  value={(newBudget as any).currency || 'USD'}
                  onChange={(e) => setNewBudget({ ...(newBudget as any), currency: e.target.value } as any)}
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
                  onClick={() => setShowAddBudget(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditingBudget(null)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Edit Budget</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <input
                  type="text"
                  value={editingBudget.category}
                  disabled
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Category cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={editingBudget.allocated_amount}
                    onChange={(e) => setEditingBudget({ ...editingBudget, allocated_amount: parseFloat(e.target.value) })}
                    step="0.01"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-14 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <select
                  value={(editingBudget as any).currency || (newBudget as any).currency || 'USD'}
                  onChange={(e) => setEditingBudget({ ...(editingBudget as any), currency: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD','EUR','GBP','JPY','CNY','SGD','MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingBudget(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBudget}
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
