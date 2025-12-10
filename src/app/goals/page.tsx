'use client';

import { useState, useEffect } from 'react';
import { Plus, Home, Plane, GraduationCap, Car, Heart, Target, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter } from '@/lib/currency';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  current_amount: number | string;
  target_amount: number | string;
  target_date: string;
  category: string;
  currency?: string | null;
  is_completed: boolean;
}

const goalCategories = [
  'Housing',
  'Retirement',
  'Emergency',
  'Vacation',
  'Education',
  'Car',
  'Wedding',
  'Other'
];

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'housing':
      return Home;
    case 'vacation':
      return Plane;
    case 'education':
      return GraduationCap;
    case 'car':
      return Car;
    case 'wedding':
      return Heart;
    default:
      return Target;
  }
};

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTab, setActiveTab] = useState('Active Goals');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    currentAmount: '',
    targetAmount: '',
    targetDate: '',
    category: 'Housing',
    currency: 'USD'
  });
  const [userSettings, setUserSettings] = useState<{ currency?: string; [key: string]: unknown } | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Load settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (settings) {
        setUserSettings(settings);
      }

      // Load goals from Supabase
      const { data: goalsData, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('target_date', { ascending: true });

      if (!error && goalsData) {
        setGoals(goalsData as Goal[]);
      }
    };

    loadData();
  }, [user]);

  const activeGoals = goals.filter(goal => !goal.is_completed);
  const completedGoals = goals.filter(goal => goal.is_completed);
  const displayedGoals = activeTab === 'Active Goals' ? activeGoals : completedGoals;

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoal.title || !newGoal.targetAmount || !newGoal.targetDate) return;

    try {
      const currentVal = parseFloat(newGoal.currentAmount || '0');
      const targetVal = parseFloat(newGoal.targetAmount || '0');
      const autoCompleted = targetVal > 0 && currentVal >= targetVal;

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          description: newGoal.description || null,
          current_amount: currentVal,
          target_amount: targetVal,
          target_date: newGoal.targetDate,
          category: newGoal.category,
          currency: newGoal.currency || userSettings?.currency || 'USD',
          is_completed: autoCompleted
        })
        .select()
        .single();

      if (error) throw error;

      setGoals([...goals, data as Goal]);
      setNewGoal({
        title: '',
        description: '',
        currentAmount: '',
        targetAmount: '',
        targetDate: '',
        category: 'Housing',
        currency: userSettings?.currency || 'USD'
      });
      setShowAddGoal(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Error adding goal:', error?.message || err);
      alert(`Failed to add goal: ${error?.message || 'Unknown error'}`);
    }
  };

  const getProgressPercentage = (current: number | string, target: number | string) => {
    const currentNum = Number(current || 0);
    const targetNum = Number(target || 0);
    if (!targetNum || Number.isNaN(targetNum)) return 0;
    return Math.min((currentNum / targetNum) * 100, 100);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    setDeletingGoal(goalId);
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal');
    } finally {
      setDeletingGoal(null);
    }
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal) return;

    try {
      const currentVal = parseFloat(String(editingGoal.current_amount || '0'));
      const targetVal = parseFloat(String(editingGoal.target_amount || '0'));
      const autoCompleted = targetVal > 0 && currentVal >= targetVal;
      const finalCompleted = autoCompleted ? true : editingGoal.is_completed;

      const { error } = await supabase
        .from('goals')
        .update({
          title: editingGoal.title,
          description: editingGoal.description || null,
          current_amount: currentVal,
          target_amount: targetVal,
          target_date: editingGoal.target_date,
          category: editingGoal.category,
          currency: editingGoal.currency || userSettings?.currency || 'USD',
          is_completed: finalCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingGoal.id);

      if (error) throw error;

      const updatedGoal: Goal = {
        ...editingGoal,
        current_amount: currentVal,
        target_amount: targetVal,
        is_completed: finalCompleted
      };

      setGoals(goals.map(g => (g.id === editingGoal.id ? updatedGoal : g)));
      setEditingGoal(null);
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('Failed to update goal');
    }
  };

  const profileCurrency = userSettings?.currency || 'USD';
  const _formatCurrency = getCurrencyFormatter(profileCurrency);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-8 animate-slide-in-up">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Financial Goals</h1>
        <p className="text-[var(--text-secondary)]">
          Set and track your financial aspirations by saving into dedicated pockets.
        </p>
      </div>

      <div>
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1 glass-card border border-[var(--card-border)] p-1 rounded-2xl w-fit shadow-sm">
            {['Active Goals', 'Completed Goals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                  ? 'bg-[var(--accent-primary)] text-white shadow'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeTab === 'Active Goals' && (
            <button
              onClick={() => setShowAddGoal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </button>
          )}
        </div>

        {/* Goals Grid */}
        <div className="space-y-6">
          {displayedGoals.map((goal) => {
            const IconComponent = getCategoryIcon(goal.category);
            const progressPercentage = getProgressPercentage(goal.current_amount, goal.target_amount);

            return (
              <div
                key={goal.id}
                onClick={() => setEditingGoal(goal)}
                className="glass-card rounded-2xl overflow-hidden border border-[var(--card-border)] shadow-md cursor-pointer hover:bg-[var(--card-hover)] transition-all duration-300"
              >
                <div className="flex">
                  {/* Goal Image */}
                  <div className="w-48 h-48 relative bg-[var(--card-border)]/30 flex items-center justify-center">
                    <IconComponent className="h-16 w-16 text-[var(--accent-primary)]" />
                  </div>

                  {/* Goal Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 mr-4">
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{goal.title}</h3>
                        <p className="text-[var(--text-secondary)] text-sm mb-4">{goal.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${goal.is_completed
                        ? 'bg-green-500/20 text-[var(--accent-success)]'
                        : 'bg-blue-500/20 text-[var(--accent-primary)]'
                        }`}>
                        {goal.category}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Progress</span>
                        <span className="text-sm text-[var(--text-primary)] font-medium">
                          {getCurrencyFormatter(goal.currency || profileCurrency)(Number(goal.current_amount || 0))} / {getCurrencyFormatter(goal.currency || profileCurrency)(Number(goal.target_amount || 0))}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--card-border)]/60 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${goal.is_completed
                            ? 'bg-[var(--accent-success)]'
                            : 'bg-[var(--accent-primary)]'
                            }`}
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {progressPercentage.toFixed(1)}% complete
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          Target: {formatDate(goal.target_date)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-end mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGoal(goal.id);
                        }}
                        disabled={deletingGoal === goal.id}
                        className="inline-flex items-center text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddGoal(false)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add New Goal</h3>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., Save for Vacation"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Brief description of your goal"
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Current Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-8 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Target Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-8 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Currency
                </label>
                <select
                  value={newGoal.currency}
                  onChange={(e) => setNewGoal({ ...newGoal, currency: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Category
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {goalCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingGoal(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Goal</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  value={editingGoal.description || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Current Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={editingGoal.current_amount?.toString() ?? ''}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        current_amount: e.target.value
                      } as Goal)
                    }
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-8 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Target Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={editingGoal.target_amount?.toString() ?? ''}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        target_amount: e.target.value
                      } as Goal)
                    }
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-8 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={editingGoal.target_date}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_date: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Category
                </label>
                <select
                  value={editingGoal.category}
                  onChange={(e) => setEditingGoal({ ...editingGoal, category: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {goalCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="goal-completed"
                  type="checkbox"
                  checked={editingGoal.is_completed}
                  onChange={(e) => setEditingGoal({ ...editingGoal, is_completed: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--card-border)] text-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
                <label htmlFor="goal-completed" className="text-sm text-[var(--text-secondary)]">
                  Mark as completed
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingGoal(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGoal}
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
