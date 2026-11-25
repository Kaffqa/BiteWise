import { startOfDay } from 'date-fns';
import type { FoodAnalysisResult, UserHealthProfile } from '@/types/ai.types';
import type { MealType } from '@/types/database.types';

const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  peanuts: ['peanut', 'peanuts', 'groundnut', 'kacang tanah'],
  'tree nuts': ['tree nut', 'tree nuts', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'kacang mede', 'kenari'],
  milk: ['milk', 'dairy', 'lactose', 'casein', 'whey', 'butter', 'cheese', 'cream', 'yogurt', 'susu'],
  lactose: ['lactose', 'milk', 'dairy', 'cream', 'cheese', 'butter', 'whey', 'susu'],
  eggs: ['egg', 'eggs', 'albumin', 'mayonnaise', 'telur'],
  wheat: ['wheat', 'gluten', 'flour', 'bread', 'pasta', 'noodle', 'gandum', 'terigu'],
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'malt', 'gandum', 'terigu'],
  soy: ['soy', 'soya', 'soybean', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari', 'lecithin', 'kedelai', 'tahu', 'tempe', 'kecap'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'mackerel', 'anchovy', 'sardine', 'ikan'],
  shellfish: ['shellfish', 'crustacean', 'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop', 'squid', 'udang', 'kepiting', 'kerang', 'cumi'],
  sesame: ['sesame', 'tahini', 'wijen'],
};

function matchesUserAllergen(detected: string, userTerms: string[]): boolean {
  if (userTerms.length === 0) return false;
  const det = detected.trim().toLowerCase();
  if (!det) return false;

  return userTerms.some((rawTerm) => {
    const term = rawTerm.trim().toLowerCase();
    if (!term) return false;
    if (det.includes(term) || term.includes(det)) return true;

    const synonyms = ALLERGEN_SYNONYMS[term] || [];
    if (synonyms.some((syn) => det.includes(syn) || syn.includes(det))) {
      return true;
    }

    // Reverse lookup: user term might be a specific synonym (e.g. "shrimp" vs detected "shellfish")
    return Object.entries(ALLERGEN_SYNONYMS).some(
      ([group, syns]) =>
        (group.includes(det) || syns.some((s) => det.includes(s))) &&
        (group.includes(term) || syns.some((s) => term.includes(s)))
    );
  });
}

/**
 * Ensures detectedAllergens and allergy warnings strictly match the user's declared
 * allergies and intolerances, preventing false "Allergen Alert" badges for safe items.
 */
export function sanitizeAnalysisForProfile(
  result: FoodAnalysisResult,
  profile: UserHealthProfile
): FoodAnalysisResult {
  const userAllergenTerms = [...(profile.allergies || []), ...(profile.intolerances || [])]
    .map((s) => s.trim())
    .filter(Boolean);

  const hasUserAllergies = userAllergenTerms.length > 0;

  // Strip allergy-typed warnings if user has zero allergies/intolerances configured
  const filteredWarnings = (result.healthWarnings || []).filter((w: any) => {
    if (!hasUserAllergies && String(w?.type || '').toLowerCase() === 'allergy') {
      return false;
    }
    return true;
  });

  const sanitizedItems = (result.items || []).map((item) => {
    const rawDetected = Array.isArray(item.detectedAllergens) ? item.detectedAllergens : [];
    const matchedAllergens = rawDetected.filter((a) => matchesUserAllergen(a, userAllergenTerms));

    let itemSafety = item.safetyStatus;
    // If the item was only marked danger because of stripped non-user allergens, restore to safe
    if (
      rawDetected.length > 0 &&
      matchedAllergens.length === 0 &&
      itemSafety === 'danger' &&
      (result.safetyStatus === 'safe' || filteredWarnings.length === 0)
    ) {
      itemSafety = 'safe';
    }

    return {
      ...item,
      detectedAllergens: matchedAllergens,
      safetyStatus: itemSafety,
    };
  });

  let overallSafety = result.safetyStatus;
  if (
    overallSafety === 'danger' &&
    !hasUserAllergies &&
    filteredWarnings.length === 0 &&
    sanitizedItems.every((i) => i.safetyStatus === 'safe')
  ) {
    overallSafety = 'safe';
  }

  return {
    ...result,
    safetyStatus: overallSafety,
    healthWarnings: filteredWarnings,
    items: sanitizedItems,
  };
}

/**
 * Maps a raw Supabase profile (snake_case) or partial camelCase object into UserHealthProfile.
 * Prevents silent field drops when calling AI prompts from different pages.
 */
export function toUserHealthProfile(profile: any): UserHealthProfile {
  return {
    allergies: Array.isArray(profile?.allergies) ? profile.allergies : [],
    intolerances: Array.isArray(profile?.intolerances) ? profile.intolerances : [],
    medicalConditions: Array.isArray(profile?.medicalConditions)
      ? profile.medicalConditions
      : Array.isArray(profile?.medical_conditions)
      ? profile.medical_conditions
      : [],
    dietaryPreferences: Array.isArray(profile?.dietaryPreferences)
      ? profile.dietaryPreferences
      : Array.isArray(profile?.dietary_preferences)
      ? profile.dietary_preferences
      : [],
    medications: Array.isArray(profile?.medications) ? profile.medications : [],
    targetCalories: profile?.targetCalories ?? profile?.target_calories ?? 2000,
    targetSodiumMg: profile?.targetSodiumMg ?? profile?.target_sodium_mg ?? 2300,
    targetSugarG: profile?.targetSugarG ?? profile?.target_sugar_g ?? 50,
  };
}

/**
 * Determines default meal category based on local clock hour.
 */
export function getMealTypeByHour(date: Date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 22) return 'dinner';
  return 'snack';
}

/**
 * Calculates current streak count and set of local-midnight day timestamps from scan records.
 */
export function calculateStreakFromScans(scanRecords: Array<{ created_at: string }>): {
  streakCount: number;
  scanDays: Set<number>;
} {
  if (!scanRecords || scanRecords.length === 0) {
    return { streakCount: 0, scanDays: new Set() };
  }

  const scanDays = new Set<number>(
    scanRecords.map((s) => startOfDay(new Date(s.created_at)).getTime())
  );

  const today = startOfDay(new Date()).getTime();
  const yesterday = today - 86400000;
  let streakCount = 0;

  if (scanDays.has(today) || scanDays.has(yesterday)) {
    let checkTime = scanDays.has(today) ? today : yesterday;
    while (scanDays.has(checkTime)) {
      streakCount++;
      checkTime -= 86400000;
    }
  }

  return { streakCount, scanDays };
}

/**
 * Scales per-serving macro fields cleanly when portion_multiplier is changed.
 */
export function scaleMealMacros(
  base: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sugar_g?: number | null;
    sodium_mg?: number | null;
  },
  multiplier: number
) {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  return {
    calories: round2((Number(base.calories) || 0) * multiplier),
    protein_g: round2((Number(base.protein_g) || 0) * multiplier),
    carbs_g: round2((Number(base.carbs_g) || 0) * multiplier),
    fat_g: round2((Number(base.fat_g) || 0) * multiplier),
    fiber_g: round2((Number(base.fiber_g) || 0) * multiplier),
    sugar_g: round2((Number(base.sugar_g) || 0) * multiplier),
    sodium_mg: round2((Number(base.sodium_mg) || 0) * multiplier),
  };
}
