import { z } from 'zod';
import type { FoodAnalysisResult } from '@/types/ai.types';
import { getDictionary } from '@/i18n';

const nonNegNum = (fallback = 0) =>
  z.preprocess((val) => {
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : fallback;
  }, z.number());

const anyNum = (fallback = 0) =>
  z.preprocess((val) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  }, z.number());

/**
 * Validates and normalizes AI food analysis output into a strict FoodAnalysisResult.
 * Throws a readable error if the payload is not a valid object.
 */
export function validateAndNormalizeFoodAnalysis(raw: unknown): FoodAnalysisResult {
  const errDict = getDictionary().errors;

  const HealthWarningItemSchema = z.union([
    z.string().transform((msg) => ({
      type: 'dietary' as const,
      severity: 'caution' as const,
      title: errDict.healthNotice,
      detail: msg,
      message: msg,
    })),
    z
      .object({
        type: z.string().optional().default('dietary'),
        severity: z.string().optional().default('medium'),
        title: z.string().optional(),
        detail: z.string().optional(),
        message: z.string().optional(),
        matchedIngredient: z.string().optional(),
      })
      .transform((w) => ({
        ...w,
        title: w.title || w.type || errDict.healthNotice,
        detail: w.detail || w.message || '',
        message: w.message || w.detail || w.title || '',
      })),
  ]);

  const DetectedItemSchema = z.object({
    name: z.string().min(1).catch(errDict.unknownItem),
    estimatedWeightG: nonNegNum(100),
    portionDescription: z.string().optional().default(errDict.defaultPortion),
    calories: nonNegNum(0),
    proteinG: nonNegNum(0),
    carbsG: nonNegNum(0),
    fatG: nonNegNum(0),
    fiberG: nonNegNum(0),
    sugarG: nonNegNum(0),
    sodiumMg: nonNegNum(0),
    safetyStatus: z.enum(['safe', 'caution', 'danger', 'unknown']).catch('safe'),
    detectedAllergens: z.array(z.string()).catch([]),
  });

  const SmartAlternativeSchema = z.object({
    originalItem: z.string().catch('Current Meal'),
    alternativeName: z.string().min(1),
    reason: z.string().catch(errDict.defaultSwapReason),
    calories: nonNegNum(0),
    proteinG: nonNegNum(0),
    carbsG: nonNegNum(0),
    fatG: nonNegNum(0),
    safetyStatus: z.enum(['safe', 'caution']).catch('safe'),
    tags: z.array(z.string()).catch([]),
  });

  const DrugInteractionSchema = z.object({
    medication: z.string().min(1),
    interactingIngredient: z.string().min(1),
    severity: z.enum(['low', 'moderate', 'severe']).catch('moderate'),
    mechanism: z.string().catch(errDict.defaultDrugMechanism),
    recommendation: z.string().catch(errDict.defaultDrugAdvice),
    source: z.string().optional(),
  });

  const GlycemicPointSchema = z.object({
    minutesAfterEating: nonNegNum(0),
    glucoseMgDl: nonNegNum(90),
  });

  const GlycemicAnalysisSchema = z.object({
    estimatedGI: nonNegNum(50),
    glycemicLoad: nonNegNum(10),
    spikeLevel: z.enum(['low', 'moderate', 'high']).catch('moderate'),
    peakGlucoseMgDl: nonNegNum(115),
    timeToBaselineMinutes: nonNegNum(120),
    curveDataPoints: z.array(GlycemicPointSchema).catch([]),
    tipToReduceSpike: z.string().catch(errDict.defaultGlycemicTip),
    fiberMitigationFactor: nonNegNum(0).optional(),
  });

  const RawFoodAnalysisSchema = z.object({
    scanType: z.enum(['meal_photo', 'nutrition_label', 'ingredients_list', 'barcode', 'not_food']).catch('meal_photo'),
    mealTitle: z.string().min(1).catch(errDict.analyzedMeal),
    confidenceScore: nonNegNum(0.85),
    safetyStatus: z.enum(['safe', 'caution', 'danger', 'unknown']).catch('unknown'),
    healthWarnings: z.array(HealthWarningItemSchema).catch([]),
    items: z.array(DetectedItemSchema).catch([]),
    totalNutrition: z
      .object({
        calories: nonNegNum(0),
        proteinG: nonNegNum(0),
        carbsG: nonNegNum(0),
        fatG: nonNegNum(0),
        fiberG: nonNegNum(0),
        sugarG: nonNegNum(0),
        sodiumMg: nonNegNum(0),
      })
      .catch({
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
      }),
    ingredientExplanations: z.array(z.any()).catch([]),
    dailyImpact: z
      .object({
        caloriesConsumedBefore: nonNegNum(0),
        caloriesAfterThisMeal: nonNegNum(0),
        caloriesRemaining: anyNum(0),
        percentageOfDailyTarget: nonNegNum(0),
        exceedsLimit: z.boolean().catch(false),
        summary: z.string().catch(''),
      })
      .optional(),
    smartAlternatives: z.array(SmartAlternativeSchema).catch([]),
    drugInteractions: z.array(DrugInteractionSchema).catch([]),
    glycemicAnalysis: GlycemicAnalysisSchema.nullable().optional(),
    recommendations: z.array(z.string()).catch([]),
    processingTimeMs: nonNegNum(0).optional(),
    modelVersion: z.string().optional(),
  });

  const parsed = RawFoodAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(errDict.invalidAnalysisStructure);
  }

  return parsed.data as unknown as FoodAnalysisResult;
}
