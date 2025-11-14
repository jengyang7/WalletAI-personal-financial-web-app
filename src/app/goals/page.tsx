'use client';

import { useState, useEffect } from 'react';
import { Plus, Home, Plane, GraduationCap, Car, Heart, Target } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter } from '@/lib/currency';

interface Goal {
  id: string;
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  category: string;
  imageUrl: string;
  isCompleted: boolean;
}

const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Save for a Down Payment',
    description: 'Saving for a house down payment',
    currentAmount: 10000,
    targetAmount: 20000,
    targetDate: '2025-06-01',
    category: 'Housing',
    imageUrl: '/house.jpg',
    isCompleted: false
  },
  {
    id: '2',
    title: 'Retirement Savings',
    description: 'Building retirement fund',
    currentAmount: 150000,
    targetAmount: 500000,
    targetDate: '2045-12-31',
    category: 'Retirement',
    imageUrl: '/retirement.jpg',
    isCompleted: false
  },
  {
    id: '3',
    title: 'Emergency Fund',
    description: '6 months of expenses',
    currentAmount: 15000,
    targetAmount: 15000,
    targetDate: '2024-12-31',
    category: 'Emergency',
    imageUrl: '/emergency.jpg',
    isCompleted: true
  }
];

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
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [activeTab, setActiveTab] = useState('Active Goals');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    category: 'Housing'
  });
  const [userSettings, setUserSettings] = useState<any>(null);

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
      }
    };
    loadSettings();
  }, [user]);

  const activeGoals = goals.filter(goal => !goal.isCompleted);
  const completedGoals = goals.filter(goal => goal.isCompleted);
  const displayedGoals = activeTab === 'Active Goals' ? activeGoals : completedGoals;

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.title && newGoal.targetAmount && newGoal.targetDate) {
      const goal: Goal = {
        id: Date.now().toString(),
        title: newGoal.title,
        description: newGoal.description,
        currentAmount: 0,
        targetAmount: parseFloat(newGoal.targetAmount),
        targetDate: newGoal.targetDate,
        category: newGoal.category,
        imageUrl: '/placeholder.jpg',
        isCompleted: false
      };
      setGoals([...goals, goal]);
      setNewGoal({
        title: '',
        description: '',
        targetAmount: '',
        targetDate: '',
        category: 'Housing'
      });
      setShowAddGoal(false);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const profileCurrency = userSettings?.currency || 'USD';
  const formatCurrency = getCurrencyFormatter(profileCurrency);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 bg-slate-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Financial Goals</h1>
        <p className="text-slate-400">Set and track your financial aspirations.</p>
      </div>

      <div>
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg mb-6 w-fit">
            {['Active Goals', 'Completed Goals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Goals Grid */}
          <div className="space-y-6">
            {displayedGoals.map((goal) => {
              const IconComponent = getCategoryIcon(goal.category);
              const progressPercentage = getProgressPercentage(goal.currentAmount, goal.targetAmount);
              
              return (
                <div
                  key={goal.id}
                  className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700"
                >
                  <div className="flex">
                    {/* Goal Image */}
                    <div className="w-48 h-48 relative bg-slate-700 flex items-center justify-center">
                      <IconComponent className="h-16 w-16 text-slate-400" />
                    </div>
                    
                    {/* Goal Details */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">{goal.title}</h3>
                          <p className="text-slate-400 text-sm mb-4">{goal.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          goal.isCompleted 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {goal.category}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-400">Progress</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-slate-400">
                            {progressPercentage.toFixed(1)}% complete
                          </span>
                          <span className="text-xs text-slate-400">
                            Target: {formatDate(goal.targetDate)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {!goal.isCompleted && (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          View Goal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New Goal Button */}
            {activeTab === 'Active Goals' && (
              <button
                onClick={() => setShowAddGoal(true)}
                className="w-full bg-slate-900 border-2 border-dashed border-slate-600 rounded-xl p-8 text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex flex-col items-center justify-center"
              >
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-lg font-medium">Add New Goal</span>
              </button>
            )}
          </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddGoal(false)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add New Goal</h3>
            
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., Save for Vacation"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Brief description of your goal"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
