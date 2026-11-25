import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIngredients } from '@/hooks/useIngredients';
import { compressImage, uploadScanImage, deleteScanImage, fileToBase64 } from '@/lib/storage';
import { analyzeFood } from '@/lib/ai-provider';
import { getMealTypeByHour, sanitizeAnalysisForProfile, toUserHealthProfile } from '@/lib/profile-utils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { FoodAnalysisResult } from '@/types/ai.types';
import type { MealType, ScanType } from '@/types/database.types';

export type ScanState = 'idle' | 'capturing' | 'uploading' | 'analyzing' | 'complete' | 'error';

const VALID_SCAN_TYPES: ScanType[] = ['meal_photo', 'nutrition_label', 'ingredients_list', 'barcode'];

/**
 * Hook for handling the food scanning pipeline.
 */
export function useScanner() {
  const { user, profile } = useAuth();
  const { addMealLog } = useNutrition();
  const { syncFromScan } = useIngredients();

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Processes the scan: compress -> AI analyze (validates food first) -> upload to Storage -> save DB.
   */
  const processScan = async (imageFile: File | Blob) => {
    if (!user || !profile) {
      setError('User not authenticated or profile missing');
      setScanState('error');
      return;
    }

    let uploadedImageUrl: string | null = null;

    try {
      setScanState('analyzing');
      setError(null);

      // 1. Compress once client-side before AI call and upload
      const compressedImage = await compressImage(imageFile);
      const base64Data = await fileToBase64(compressedImage);
      const userHealthProfile = toUserHealthProfile(profile);

      // 2. Query today's consumed nutrition using local calendar date (log_date)
      const localToday = format(new Date(), 'yyyy-MM-dd');
      const { data: todayLogs } = await (supabase as any)
        .from('meal_logs')
        .select('calories, sodium_mg, sugar_g')
        .eq('user_id', user.id)
        .eq('log_date', localToday);

      const consumedToday = {
        calories: todayLogs?.reduce((sum: number, log: any) => sum + (Number(log.calories) || 0), 0) || 0,
        sodiumMg: todayLogs?.reduce((sum: number, log: any) => sum + (Number(log.sodium_mg) || 0), 0) || 0,
        sugarG: todayLogs?.reduce((sum: number, log: any) => sum + (Number(log.sugar_g) || 0), 0) || 0,
      };

      // 3. Analyze food via authenticated serverless proxy BEFORE uploading image to Storage
      const rawAnalysisResult = await analyzeFood(base64Data, userHealthProfile, consumedToday);

      // Block non-food items before touching Storage or DB
      if (
        (rawAnalysisResult.scanType as string) === 'not_food' ||
        rawAnalysisResult.mealTitle.toLowerCase() === 'not a food item'
      ) {
        throw new Error('NOT_FOOD');
      }

      const analysisResult = sanitizeAnalysisForProfile(rawAnalysisResult, userHealthProfile);

      // 4. Upload verified food photo (skip double compression)
      setScanState('uploading');
      uploadedImageUrl = await uploadScanImage(user.id, compressedImage, true);

      const resolvedScanType: ScanType = VALID_SCAN_TYPES.includes(analysisResult.scanType as ScanType)
        ? (analysisResult.scanType as ScanType)
        : 'meal_photo';

      // 5. Save scan record
      const scanInsertData: any = {
        user_id: user.id,
        image_url: uploadedImageUrl,
        scan_type: resolvedScanType,
        meal_title: analysisResult.mealTitle,
        safety_status: analysisResult.safetyStatus,
        health_warnings: analysisResult.healthWarnings || [],
        total_calories: analysisResult.totalNutrition?.calories,
        total_protein_g: analysisResult.totalNutrition?.proteinG,
        total_carbs_g: analysisResult.totalNutrition?.carbsG,
        total_fat_g: analysisResult.totalNutrition?.fatG,
        total_fiber_g: analysisResult.totalNutrition?.fiberG,
        total_sugar_g: analysisResult.totalNutrition?.sugarG,
        total_sodium_mg: analysisResult.totalNutrition?.sodiumMg,
        processing_time_ms: Math.round(Number(analysisResult.processingTimeMs) || 0),
        raw_ai_response: {
          ...(analysisResult.dailyImpact || {}),
          dailyImpact: analysisResult.dailyImpact,
          smartAlternatives: analysisResult.smartAlternatives || [],
          drugInteractions: analysisResult.drugInteractions || [],
          glycemicAnalysis: analysisResult.glycemicAnalysis || null,
        },
      };

      const { data: scanData, error: scanError } = await supabase
        .from('food_scans')
        .insert([scanInsertData] as never[])
        .select()
        .single();

      if (scanError || !scanData) throw scanError || new Error('Failed to save scan');

      const scanId = (scanData as any).id;

      // 6. Save scan items
      if (Array.isArray(analysisResult.items) && analysisResult.items.length > 0) {
        const scanItemsData = analysisResult.items.map((item) => ({
          scan_id: scanId,
          user_id: user.id,
          item_name: item.name,
          estimated_weight_g: item.estimatedWeightG,
          portion_description: item.portionDescription,
          calories: item.calories,
          protein_g: item.proteinG,
          carbs_g: item.carbsG,
          fat_g: item.fatG,
          fiber_g: item.fiberG,
          sugar_g: item.sugarG,
          sodium_mg: item.sodiumMg,
          detected_allergens: item.detectedAllergens,
          item_safety_status: item.safetyStatus,
        }));

        const { error: itemsError } = await supabase
          .from('scan_items')
          .insert(scanItemsData as any);

        if (itemsError) console.error('Failed to save scan items:', itemsError);
      }

      // 7. Auto-log if safe
      if (analysisResult.safetyStatus === 'safe') {
        const logData: any = {
          user_id: user.id,
          scan_id: scanId,
          meal_type: getMealTypeByHour(),
          food_name: analysisResult.mealTitle,
          calories: analysisResult.totalNutrition?.calories,
          protein_g: analysisResult.totalNutrition?.proteinG,
          carbs_g: analysisResult.totalNutrition?.carbsG,
          fat_g: analysisResult.totalNutrition?.fatG,
          fiber_g: analysisResult.totalNutrition?.fiberG,
          sugar_g: analysisResult.totalNutrition?.sugarG,
          sodium_mg: analysisResult.totalNutrition?.sodiumMg,
          consumed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
          log_date: localToday,
          portion_multiplier: 1,
        };
        await addMealLog(logData);
      }

      // 8. Background sync ingredients
      if (Array.isArray(analysisResult.items) && analysisResult.items.length > 0) {
        syncFromScan(analysisResult.items, scanId).catch((err) =>
          console.error('Failed to sync ingredients:', err)
        );
      }

      // 9. Create notifications
      try {
        const newNotifs = [];

        if (analysisResult.safetyStatus === 'danger') {
          newNotifs.push({
            user_id: user.id,
            type: 'alert',
            title: 'Allergen Alert!',
            message: `We detected severe allergens in ${analysisResult.mealTitle} that contradict your profile. Do not consume!`,
            is_read: false,
          });
        } else if (analysisResult.safetyStatus === 'caution') {
          newNotifs.push({
            user_id: user.id,
            type: 'alert',
            title: 'Caution Flagged',
            message: `We found flagged ingredients in ${analysisResult.mealTitle} that you might want to review.`,
            is_read: false,
          });
        }

        if (analysisResult.dailyImpact?.exceedsLimit) {
          newNotifs.push({
            user_id: user.id,
            type: 'info',
            title: 'Calorie Limit Warning',
            message: `Eating ${analysisResult.mealTitle} will put you over your daily limit by ${Math.round(Math.abs(analysisResult.dailyImpact.caloriesRemaining || 0))} kcal!`,
            is_read: false,
          });
        }

        if (analysisResult.drugInteractions && analysisResult.drugInteractions.length > 0) {
          const severeInteraction = analysisResult.drugInteractions.find((d) => d.severity === 'severe');
          if (severeInteraction) {
            newNotifs.push({
              user_id: user.id,
              type: 'alert',
              title: 'Critical Drug Interaction!',
              message: `Interaction detected between ${severeInteraction.interactingIngredient} and ${severeInteraction.medication}! Review recommendations before consuming.`,
              is_read: false,
            });
          }
        }

        if (newNotifs.length > 0) {
          await (supabase as any).from('notifications').insert(newNotifs);
        }
      } catch (notifErr) {
        console.error('Failed to generate notifications:', notifErr);
      }

      setResult({ ...analysisResult, id: scanId } as FoodAnalysisResult & { id: string });
      setScanState('complete');
    } catch (err: any) {
      // Roll back orphan storage file if upload succeeded before a DB failure
      if (uploadedImageUrl) {
        deleteScanImage(uploadedImageUrl).catch(() => undefined);
      }

      console.error('Scan error:', err);

      let friendlyError = 'An unexpected error occurred while scanning the image.';
      const rawError = err?.message || '';

      if (rawError === 'NOT_FOOD') {
        friendlyError =
          "Oops! This doesn't look like food or drink. Please take a photo of an actual meal for analysis.";
      } else if (
        rawError.includes('503') ||
        rawError.includes('UNAVAILABLE') ||
        rawError.includes('high demand') ||
        rawError.includes('500') ||
        rawError.includes('429')
      ) {
        friendlyError =
          'The AI system is experiencing high demand. Backup providers were attempted but also failed. Please wait a moment and try again.';
      } else if (rawError.includes('timed out')) {
        friendlyError = 'AI analysis took too long. Please check your connection and try again.';
      } else if (rawError.includes('fetch') || rawError.includes('network')) {
        friendlyError = 'Internet connection lost. Please check your network and try again.';
      } else if (rawError.includes('API key') || rawError.includes('configured')) {
        friendlyError = 'System is not configured correctly (Missing server API key).';
      } else {
        friendlyError = `Failed to analyze image: ${rawError}`;
      }

      setError(friendlyError);
      setScanState('error');
    }
  };

  const reset = () => {
    setScanState('idle');
    setResult(null);
    setError(null);
  };

  /**
   * Manually confirm meal logging for caution/danger items.
   */
  const confirmMealLog = async (mealType: MealType = getMealTypeByHour()) => {
    if (!user || !result || !(result as any).id) return;

    const logData: any = {
      user_id: user.id,
      scan_id: (result as any).id,
      meal_type: mealType,
      food_name: result.mealTitle,
      calories: result.totalNutrition?.calories,
      protein_g: result.totalNutrition?.proteinG,
      carbs_g: result.totalNutrition?.carbsG,
      fat_g: result.totalNutrition?.fatG,
      fiber_g: result.totalNutrition?.fiberG,
      sugar_g: result.totalNutrition?.sugarG,
      sodium_mg: result.totalNutrition?.sodiumMg,
      consumed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      log_date: format(new Date(), 'yyyy-MM-dd'),
      portion_multiplier: 1,
    };

    await addMealLog(logData);
  };

  return {
    scanState,
    result,
    error,
    processScan,
    reset,
    confirmMealLog,
  };
}
