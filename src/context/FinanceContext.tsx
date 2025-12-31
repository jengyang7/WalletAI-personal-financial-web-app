'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { GoogleGenAI } from '@google/genai';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  currency?: string;
  wallet_id?: string;
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
  reloadExpenses: () => Promise<void>;
  reloadBudgets: () => Promise<void>;
  reloadSubscriptions: () => Promise<void>;
  isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export type { Subscription };

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data when user is authenticated
  useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      if (!user) {
        setExpenses([]);
        setBudgets([]);
        setSubscriptions([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch all data in parallel
        const [expensesResult, budgetsResult, subscriptionsResult] = await Promise.all([
          fetchExpenses(),
          fetchBudgets(),
          fetchSubscriptions()
        ]);

        if (mounted) {
          // Batch updates
          setExpenses(expensesResult);
          setBudgets(budgetsResult);
          setSubscriptions(subscriptionsResult);
        }
      } catch (error) {
        console.error('Error loading finance data:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAllData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const fetchExpenses = async (): Promise<Expense[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchBudgets = async (): Promise<Budget[]> => {
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

        const spent = (expenseData as { amount: number }[] | null)?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

        return {
          id: budget.id,
          category: budget.category,
          allocated_amount: budget.allocated_amount,
          spent,
          currency: budget.currency
        };
      })
    );

    return budgetsWithCalculations;
  };

  const fetchSubscriptions = async (): Promise<Subscription[]> => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('next_billing_date', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  // Wrapper functions for manual reload
  const reloadExpenses = async () => {
    const data = await fetchExpenses();
    setExpenses(data);
  };

  const reloadBudgets = async () => {
    const data = await fetchBudgets();
    setBudgets(data);
  };

  const reloadSubscriptions = async () => {
    const data = await fetchSubscriptions();
    setSubscriptions(data);
  };

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!user) return;

    try {
      // Generate embedding for semantic search
      let embedding: number[] | null = null;
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (apiKey) {
          const genAI = new GoogleGenAI({ apiKey });

          // Create embedding text (description only)
          const embeddingText = expenseData.description;
          const result = await genAI.models.embedContent({
            model: 'gemini-embedding-001',
            contents: embeddingText,
            config: {
              outputDimensionality: 768
            }
          });
          embedding = result.embeddings?.[0]?.values || null;
          console.log('[addExpense] Generated embedding for:', expenseData.description);
        }
      } catch (embeddingError) {
        // Log error but don't fail expense creation
        console.warn('[addExpense] Failed to generate embedding:', embeddingError);
        // Continue without embedding - can be generated later
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: expenseData.amount,
          description: expenseData.description,
          category: expenseData.category,
          date: expenseData.date,
          currency: expenseData.currency || 'USD',
          wallet_id: expenseData.wallet_id || null,
          embedding: embedding  // Include embedding if generated
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state and sort by date (newest first)
      setExpenses(prev => [...prev, data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      // Reload budgets to update spent amounts
      await reloadBudgets();
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
      await reloadBudgets();
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
      reloadExpenses,
      reloadBudgets,
      reloadSubscriptions,
      isLoading
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

// End of file
