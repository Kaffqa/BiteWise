import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { MealLog, DailyNutritionSummary } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface NutritionContextType {
  todaySummary: DailyNutritionSummary | null;
  todayMealLogs: MealLog[];
  loading: boolean;
  addMealLog: (log: Omit<MealLog, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMealLog: (logId: string, updates: Partial<MealLog>) => Promise<void>;
  removeMealLog: (logId: string) => Promise<void>;
  refreshToday: () => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

/**
 * Context provider for daily nutrition tracking using local calendar dates.
 */
export function NutritionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [todaySummary, setTodaySummary] = useState<DailyNutritionSummary | null>(null);
  const [todayMealLogs, setTodayMealLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshToday = useCallback(async () => {
    if (!user) {
      setTodaySummary(null);
      setTodayMealLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: summaryData } = await supabase
        .from('daily_nutrition_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('summary_date', today)
        .maybeSingle();

      setTodaySummary(summaryData);

      const { data: logsData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .order('consumed_at', { ascending: true });

      if (logsData) {
        setTodayMealLogs(logsData);
      }
    } catch (error) {
      console.error('Error fetching today nutrition:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshToday();

    if (!user) return;

    const subscription = supabase
      .channel('public:meal_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_logs', filter: `user_id=eq.${user.id}` },
        () => {
          refreshToday();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, refreshToday]);

  const addMealLog = async (log: Omit<MealLog, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await (supabase.from('meal_logs') as any).insert([log]);
    if (error) throw error;
    await refreshToday();
  };

  const updateMealLog = async (logId: string, updates: Partial<MealLog>) => {
    if (!user) return;
    const { error } = await (supabase.from('meal_logs') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', logId)
      .eq('user_id', user.id);
    if (error) throw error;
    await refreshToday();
  };

  const removeMealLog = async (logId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id);
    if (error) throw error;
    await refreshToday();
  };

  return (
    <NutritionContext.Provider
      value={{
        todaySummary,
        todayMealLogs,
        loading,
        addMealLog,
        updateMealLog,
        removeMealLog,
        refreshToday,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
}

/**
 * Hook to access nutrition context.
 */
export function useNutrition() {
  const context = useContext(NutritionContext);
  if (context === undefined) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
}
