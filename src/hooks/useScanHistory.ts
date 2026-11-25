import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { FoodScan, SafetyStatus } from '@/types/database.types';

interface ScanFilters {
  safetyStatus?: SafetyStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for fetching scan history with pagination and filtering.
 * Intentionally excludes raw_ai_response JSONB to keep list queries lightweight.
 */
export function useScanHistory(pageSize: number = 20, initialFilters: ScanFilters = {}) {
  const { user } = useAuth();
  const [scans, setScans] = useState<FoodScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ScanFilters>(initialFilters);
  const [offset, setOffset] = useState(0);

  const fetchScans = useCallback(async (reset: boolean = false) => {
    if (!user) {
      setScans([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;

      let query = supabase
        .from('food_scans')
        .select(
          'id, user_id, image_url, thumbnail_url, scan_type, meal_title, confidence_score, safety_status, health_warnings, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, total_sugar_g, total_sodium_mg, created_at, meal_logs(id, meal_type, portion_multiplier, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, consumed_at)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + pageSize - 1);

      if (filters.safetyStatus) {
        query = query.eq('safety_status', filters.safetyStatus);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const results = (data || []) as FoodScan[];

      setScans((prev) => (reset ? results : [...prev, ...results]));
      setHasMore(results.length === pageSize);
      setOffset(currentOffset + results.length);
    } catch (err) {
      console.error('Error fetching scan history:', err);
    } finally {
      setLoading(false);
    }
  }, [user, offset, pageSize, filters]);

  useEffect(() => {
    fetchScans(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, user]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchScans(false);
    }
  }, [loading, hasMore, fetchScans]);

  const setFilter = useCallback((newFilters: ScanFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const refresh = useCallback(() => {
    return fetchScans(true);
  }, [fetchScans]);

  return {
    scans,
    loading,
    hasMore,
    loadMore,
    setFilter,
    filters,
    refresh,
  };
}
