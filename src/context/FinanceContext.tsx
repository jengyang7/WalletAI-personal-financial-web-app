'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  currency?: string;
}

interface Budget {
  id: string;
  category: string;
  allocated_amount: number;
  spent: number;
  currency?: string;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date: string;
  description?: string;
  is_active: boolean;
}

interface FinanceContextType {
  expenses: Expense[];
  budgets: Budget[];
  subscriptions: Subscription[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addBudget: (budget: Omit<Budget, 'id' | 'spent'>) => void;
  reloadBudgets: () => Promise<void>;
  reloadSubscriptions: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadExpenses();
      loadBudgets();
      loadSubscriptions();
    } else {
      setExpenses([]);
      setBudgets([]);
      setSubscriptions([]);
      setLoading(false);
    }
  }, [user]);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calculate spent amounts
      const budgetsWithCalculations = await Promise.all(
        (data || []).map(async (budget) => {
          const { data: expenseData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('category', budget.category);

          const spent = expenseData?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

          return {
            id: budget.id,
            category: budget.category,
            allocated_amount: budget.allocated_amount,
            spent,
            currency: budget.currency
          };
        })
      );

      setBudgets(budgetsWithCalculations);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('next_billing_date', { ascending: true });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: expenseData.amount,
          description: expenseData.description,
          category: expenseData.category,
          date: expenseData.date,
          currency: expenseData.currency || 'USD'
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setExpenses(prev => [data, ...prev]);
      
      // Reload budgets to update spent amounts
      loadBudgets();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const addBudget = async (budgetData: Omit<Budget, 'id' | 'spent'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category: budgetData.category,
          allocated_amount: budgetData.allocated_amount
        })
        .select()
        .single();

      if (error) throw error;

      // Reload budgets to get calculated values
      loadBudgets();
    } catch (error) {
      console.error('Error adding budget:', error);
      throw error;
    }
  };

  return (
    <FinanceContext.Provider value={{
      expenses,
      budgets,
      subscriptions,
      addExpense,
      addBudget,
      reloadBudgets: loadBudgets,
      reloadSubscriptions: loadSubscriptions
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}

export type { Subscription };
