import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { generatePersonalIngredients, enrichIngredients } from '@/lib/ai-provider';
import { toUserHealthProfile } from '@/lib/profile-utils';

export interface UserIngredient {
  id: string;
  user_id: string;
  ingredient_name: string;
  category: string | null;
  status: 'Safe' | 'Flagged' | 'Allergen';
  reason: string | null;
  description: string | null;
  commonly_found_in: { icon: string; label: string }[];
  source: 'onboarding' | 'scan' | 'manual';
  first_detected_scan_id: string | null;
  times_encountered: number;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 8;

export function useIngredients() {
  const { user, profile } = useAuth();
  const [ingredients, setIngredients] = useState<UserIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Safe' | 'Flagged' | 'Allergen'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchIngredients = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('user_ingredients')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('status', { ascending: true })
        .order('times_encountered', { ascending: false });

      // Apply filter
      if (filter !== 'All') {
        query = query.eq('status', filter);
      }

      // Apply search
      if (searchQuery.trim()) {
        query = query.or(`ingredient_name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      setIngredients((data as any) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching ingredients:', err);
      setError(err.message || 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, [user, filter, searchQuery, page]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);

  const generateSeedIngredients = useCallback(async () => {
    if (!user || !profile) return;
    try {
      setIsGenerating(true);
      const userProfile = toUserHealthProfile(profile);

      const aiIngredients = await generatePersonalIngredients(userProfile);

      if (aiIngredients && aiIngredients.length > 0) {
        const rows = aiIngredients.map((ing: any) => ({
          user_id: user.id,
          ingredient_name: ing.ingredientName,
          category: ing.category,
          status: ing.status,
          reason: ing.reason,
          description: ing.description,
          commonly_found_in: ing.commonlyFoundIn || [],
          source: 'onboarding',
          times_encountered: 1,
        }));

        const { error: insertError } = await supabase
          .from('user_ingredients')
          .upsert(rows as any, { onConflict: 'user_id,ingredient_name', ignoreDuplicates: true });

        if (insertError) {
          console.error('Error inserting seed ingredients:', insertError);
        }

        await fetchIngredients();
      }
    } catch (err) {
      console.error('Error generating seed ingredients:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [user, profile, fetchIngredients]);

  const syncFromScan = useCallback(async (scanItems: any[], scanId: string) => {
    if (!user || !profile || !scanItems?.length) return;
    try {
      // 1. Collect valid ingredient names
      const validItems = scanItems.map(item => ({
        name: (item.item_name || item.name || '').trim(),
        item
      })).filter(x => Boolean(x.name));

      if (validItems.length === 0) return;

      const ingredientNames = Array.from(new Set(validItems.map(x => x.name)));

      // 2. Single Batch SELECT to check existing ingredients in one query
      const { data: existingRecords } = await supabase
        .from('user_ingredients')
        .select('id, ingredient_name, times_encountered')
        .eq('user_id', user.id)
        .in('ingredient_name', ingredientNames);

      const existingMap = new Map<string, { id: string; times_encountered: number }>();
      (existingRecords || []).forEach((rec: any) => {
        existingMap.set(rec.ingredient_name.toLowerCase(), rec);
      });

      const existingUpdates: Promise<any>[] = [];
      const newItemsToEnrich: { ingredientName: string; item: any }[] = [];

      for (const { name: ingredientName, item } of validItems) {
        const existing = existingMap.get(ingredientName.toLowerCase());
        if (existing) {
          existingUpdates.push(
            (supabase.from('user_ingredients') as any)
              .update({
                times_encountered: (existing.times_encountered || 1) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
          );
        } else {
          if (!newItemsToEnrich.some(x => x.ingredientName.toLowerCase() === ingredientName.toLowerCase())) {
            newItemsToEnrich.push({ ingredientName, item });
          }
        }
      }

      // Execute updates in parallel
      if (existingUpdates.length > 0) {
        await Promise.all(existingUpdates);
      }

      // 3. Batch enrich & insert new ingredients
      if (newItemsToEnrich.length > 0) {
        const namesToEnrich = newItemsToEnrich.map(i => i.ingredientName);
        const userProfile = toUserHealthProfile(profile);
        
        let enrichedData: any[] = [];
        try {
          enrichedData = await enrichIngredients(namesToEnrich, userProfile);
        } catch (enrichErr) {
          console.error('Enrichment failed, falling back to basic data', enrichErr);
        }

        const newIngredientsPayload = newItemsToEnrich.map(({ ingredientName, item }) => {
          const enriched = enrichedData.find((e: any) => e.ingredientName?.toLowerCase() === ingredientName.toLowerCase()) || {};

          let status: 'Safe' | 'Flagged' | 'Allergen' = 'Safe';
          let reason = enriched.reason || 'No known concerns for your profile.';
          
          const itemSafety = item.item_safety_status || item.safetyStatus;
          if (itemSafety === 'danger') {
            status = 'Allergen';
            if (!enriched.reason) reason = 'Flagged as dangerous during food scan analysis.';
          } else if (itemSafety === 'caution') {
            status = 'Flagged';
            if (!enriched.reason) reason = 'Flagged as caution during food scan analysis.';
          }

          return {
            user_id: user.id,
            ingredient_name: ingredientName,
            category: enriched.category || item.category || 'Unknown',
            status,
            reason,
            description: enriched.description || item.portion_description || item.portionDescription || null,
            commonly_found_in: enriched.commonlyFoundIn || [],
            source: 'scan' as const,
            first_detected_scan_id: scanId,
            times_encountered: 1,
          };
        });

        // Single Batch INSERT
        await supabase
          .from('user_ingredients')
          .insert(newIngredientsPayload as any);
      }
    } catch (err) {
      console.error('Error syncing ingredients from scan:', err);
    }
  }, [user, profile]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    ingredients,
    loading,
    error,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalCount,
    totalPages,
    isGenerating,
    generateSeedIngredients,
    syncFromScan,
    refetch: fetchIngredients,
  };
}
