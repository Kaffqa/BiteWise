import type { UserHealthProfile, ConsumedToday } from '@/types/ai.types';

/**
 * Builds the system prompt for the AI model based on the user's health profile.
 * @param profile - The user's health profile including allergies and conditions.
 * @param consumedToday - Optional data about what the user has already consumed today.
 * @returns A formatted system prompt string.
 */
export function buildSystemPrompt(profile: UserHealthProfile, consumedToday?: ConsumedToday): string {
  const allergies = profile.allergies?.length ? profile.allergies.join(', ') : 'None specified';
  const intolerances = profile.intolerances?.length ? profile.intolerances.join(', ') : 'None specified';
  const conditions = profile.medicalConditions?.length ? profile.medicalConditions.join(', ') : 'None specified';
  const diet = profile.dietaryPreferences?.length ? profile.dietaryPreferences.join(', ') : 'None specified';
  const medications = profile.medications?.length ? profile.medications.join(', ') : 'None specified';

  const targetCalories = profile.targetCalories || 2000;
  const targetSodiumMg = profile.targetSodiumMg || 2300;
  const targetSugarG = profile.targetSugarG || 50;

  const consumed = consumedToday || { calories: 0, sodiumMg: 0, sugarG: 0 };
  const remainingCalories = Math.max(0, targetCalories - consumed.calories);
  const remainingSodium = Math.max(0, targetSodiumMg - consumed.sodiumMg);
  const remainingSugar = Math.max(0, targetSugarG - consumed.sugarG);

  return `You are an expert nutritionist, food scientist, and dietary safety analyst. Your task is to analyze the provided food image and return a strict JSON object.

The image may be a meal photo, a nutrition label, or an ingredients list.

User's Health Profile:
- Allergies: ${allergies}
- Intolerances: ${intolerances}
- Medical Conditions: ${conditions}
- Dietary Preferences: ${diet}
- Current Active Medications: ${medications}

User's Daily Nutrition Context:
- Daily Calorie Target: ${targetCalories} kcal
- Daily Sodium Limit: ${targetSodiumMg} mg
- Daily Sugar Limit: ${targetSugarG} g
- Already Consumed Today: ${consumed.calories} kcal, ${consumed.sodiumMg}mg sodium, ${consumed.sugarG}g sugar
- Remaining Today: ${remainingCalories} kcal, ${remainingSodium}mg sodium, ${remainingSugar}g sugar

Instructions:
1. Auto-detect if the image is a meal photo, nutrition label, or ingredients list.
2. For meals: estimate portion sizes, identify each food item, estimate nutrition per item.
3. For labels: OCR the text, extract nutritional facts and ingredients.
4. Cross-reference all identified ingredients against the user's health profile.
5. Flag any warnings with severity levels ('low', 'medium', 'high', 'critical').
6. Provide plain-language explanations for scientific ingredient names.
7. IMPORTANT NON-FOOD RULE: If the image clearly DOES NOT contain any food, drink, or nutritional label (e.g. a person, a keyboard, a shoe), you MUST set scanType to "not_food", mealTitle to "Not a Food Item", safetyStatus to "unknown", and set all nutrition values to 0.
8. DAILY CONTEXT RULE: Compare this meal's nutrition against the user's remaining daily allowance. In the "dailyImpact" object:
   - Set caloriesConsumedBefore to the already consumed calories (${consumed.calories}).
   - Set caloriesAfterThisMeal to consumed + this meal's calories.
   - Set caloriesRemaining to the remaining calories AFTER this meal (can be negative if exceeded).
   - Set percentageOfDailyTarget to the percentage of the TOTAL daily target this meal represents.
   - Set exceedsLimit to true if this meal causes ANY daily limit (calories, sodium, or sugar) to be exceeded.
   - Write a concise 1-2 sentence summary explaining the daily impact.
   - If this meal causes the user to EXCEED any daily limit, also add a health warning with severity 'medium'.
9. In "recommendations", suggest adjustments for remaining meals if user is close to or exceeding limits.
10. SMART SWAP RULE: If safetyStatus is 'caution' or 'danger', or if total calories exceed 500 kcal, or limits are exceeded, generate 2-3 healthier, culturally relevant food alternatives in "smartAlternatives". For each: specify originalItem, alternativeName, reason (why this is safer/healthier), calories, proteinG, carbsG, fatG, safetyStatus ('safe' or 'caution'), and tags (e.g. ["Lower Calorie", "Low GI", "Allergen-Free", "Indonesian Local"]). If safe, provide 1 lighter option.
11. DRUG-FOOD INTERACTION RULE: If user has medications listed (${medications}), check all detected food ingredients against them. Detect interactions such as: Warfarin with Vitamin K greens (spinach/kale), Statins or Amlodipine with Grapefruit, ACE Inhibitors with excess Potassium (bananas/avocado), MAOIs with Tyramine (fermented foods/aged cheese), Levothyroxine with high Calcium/Soy, Metformin with Alcohol, NSAIDs with high caffeine. Populate "drugInteractions" with medication, interactingIngredient, severity ('low', 'moderate', 'severe'), mechanism (biochemical explanation), and recommendation (e.g., "Allow 2-3 hours between medication and meal"). If none, return empty array [].
12. GLYCEMIC ANALYSIS RULE: Estimate the glycemic impact of this meal in "glycemicAnalysis". Calculate:
   - estimatedGI: 0-100 (e.g. 75 for white rice, 45 for brown rice/vegetables)
   - glycemicLoad: number (GI * net carbs / 100)
   - spikeLevel: 'low' (peak <120 mg/dL), 'moderate' (120-150 mg/dL), 'high' (>150 mg/dL)
   - peakGlucoseMgDl: estimated peak blood sugar (e.g. 110-175 mg/dL)
   - timeToBaselineMinutes: typically 120-180 min
   - fiberMitigationFactor: 0.0 to 1.0 (how effectively meal's fiber/protein dampens spike)
   - tipToReduceSpike: practical hack (e.g. "Eat veggies & protein first before carbs to flatten spike by 30%")
   - curveDataPoints: array of 13 data points at minutes [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180] showing baseline ~90 mg/dL, rise to peak, and return to baseline.
13. You MUST return ONLY valid JSON matching the exact schema provided. Do not include markdown formatting or extra text.

Safety Classification Rules:
- Critical: Contains known allergens for the user.
- High: Strongly contradicts medical conditions or intolerances.
- Medium: Potential trace amounts or moderate contradiction to diet/conditions, OR exceeding daily nutrition limits.
- Low: General dietary recommendations or minor notes.
- Safe: No known issues for the user.
`;
}

export function buildTextSystemPrompt(profile: UserHealthProfile): string {
  const allergies = profile.allergies?.length ? profile.allergies.join(', ') : 'None specified';
  const intolerances = profile.intolerances?.length ? profile.intolerances.join(', ') : 'None specified';
  const conditions = profile.medicalConditions?.length ? profile.medicalConditions.join(', ') : 'None specified';
  const diet = profile.dietaryPreferences?.length ? profile.dietaryPreferences.join(', ') : 'None specified';
  const medications = profile.medications?.length ? profile.medications.join(', ') : 'None specified';

  return `You are an expert nutritionist, food scientist, and dietary safety analyst. Your task is to analyze the user's food description and return a strict JSON object.

User's Health Profile:
- Allergies: ${allergies}
- Intolerances: ${intolerances}
- Medical Conditions: ${conditions}
- Dietary Preferences: ${diet}
- Current Active Medications: ${medications}

Instructions:
1. Parse the user's description of their meal.
2. Estimate portion sizes, identify each food item, estimate nutrition per item.
3. Cross-reference all identified ingredients against the user's health profile.
4. Flag any warnings with severity levels ('low', 'medium', 'high', 'critical').
5. SMART SWAP: Suggest 2-3 healthier/lighter alternative meals in "smartAlternatives".
6. DRUG INTERACTIONS: Check ingredients against medications (${medications}) in "drugInteractions".
7. GLYCEMIC ANALYSIS: Estimate GI, Glycemic Load, spike level, curve points in "glycemicAnalysis".
8. You MUST return ONLY valid JSON matching the exact schema provided. Do not include markdown formatting or extra text.

Safety Classification Rules:
- Critical: Contains known allergens for the user.
- High: Strongly contradicts medical conditions or intolerances.
- Medium: Potential trace amounts or moderate contradiction to diet/conditions.
- Low: General dietary recommendations or minor notes.
- Safe: No known issues for the user.
`;
}

/**
 * Returns the default user prompt for food analysis.
 */
export function buildUserPrompt(): string {
  return 'Analyze this food image. Identify all food items, estimate nutrition, and check for safety concerns based on my health profile.';
}

export const FOOD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    scanType: { type: "string", enum: ["meal_photo", "nutrition_label", "barcode", "not_food"] },
    mealTitle: { type: "string" },
    confidenceScore: { type: "number" },
    safetyStatus: { type: "string", enum: ["safe", "caution", "danger", "unknown"] },
    healthWarnings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          message: { type: "string" }
        },
        required: ["type", "severity", "message"]
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          estimatedWeightG: { type: "number" },
          portionDescription: { type: "string" },
          calories: { type: "number" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
          fiberG: { type: "number" },
          sugarG: { type: "number" },
          sodiumMg: { type: "number" },
          confidenceScore: { type: "number" },
          safetyStatus: { type: "string", enum: ["safe", "caution", "danger", "unknown"] },
          detectedAllergens: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["name", "calories"]
      }
    },
    totalNutrition: {
      type: "object",
      properties: {
        calories: { type: "number" },
        proteinG: { type: "number" },
        carbsG: { type: "number" },
        fatG: { type: "number" },
        fiberG: { type: "number" },
        sugarG: { type: "number" },
        sodiumMg: { type: "number" }
      },
      required: ["calories", "proteinG", "carbsG", "fatG"]
    },
    ingredientExplanations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          explanation: { type: "string" }
        }
      }
    },
    dailyImpact: {
      type: "object",
      properties: {
        caloriesConsumedBefore: { type: "number" },
        caloriesAfterThisMeal: { type: "number" },
        caloriesRemaining: { type: "number" },
        percentageOfDailyTarget: { type: "number" },
        exceedsLimit: { type: "boolean" },
        summary: { type: "string" }
      },
      required: ["caloriesConsumedBefore", "caloriesAfterThisMeal", "caloriesRemaining", "percentageOfDailyTarget", "exceedsLimit", "summary"]
    },
    smartAlternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          originalItem: { type: "string" },
          alternativeName: { type: "string" },
          reason: { type: "string" },
          calories: { type: "number" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
          safetyStatus: { type: "string", enum: ["safe", "caution"] },
          tags: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["originalItem", "alternativeName", "reason", "calories", "safetyStatus", "tags"]
      }
    },
    drugInteractions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          medication: { type: "string" },
          interactingIngredient: { type: "string" },
          severity: { type: "string", enum: ["low", "moderate", "severe"] },
          mechanism: { type: "string" },
          recommendation: { type: "string" },
          source: { type: "string" }
        },
        required: ["medication", "interactingIngredient", "severity", "mechanism", "recommendation"]
      }
    },
    glycemicAnalysis: {
      type: "object",
      properties: {
        estimatedGI: { type: "number" },
        glycemicLoad: { type: "number" },
        spikeLevel: { type: "string", enum: ["low", "moderate", "high"] },
        peakGlucoseMgDl: { type: "number" },
        timeToBaselineMinutes: { type: "number" },
        curveDataPoints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              minutesAfterEating: { type: "number" },
              glucoseMgDl: { type: "number" }
            },
            required: ["minutesAfterEating", "glucoseMgDl"]
          }
        },
        tipToReduceSpike: { type: "string" },
        fiberMitigationFactor: { type: "number" }
      },
      required: ["estimatedGI", "glycemicLoad", "spikeLevel", "peakGlucoseMgDl", "curveDataPoints", "tipToReduceSpike"]
    },
    recommendations: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["scanType", "mealTitle", "safetyStatus", "healthWarnings", "items", "totalNutrition", "dailyImpact"]
};

export function buildIngredientsSystemPrompt(profile: UserHealthProfile): string {
  const allergies = profile.allergies?.length ? profile.allergies.join(', ') : 'None specified';
  const intolerances = profile.intolerances?.length ? profile.intolerances.join(', ') : 'None specified';
  const conditions = profile.medicalConditions?.length ? profile.medicalConditions.join(', ') : 'None specified';
  const diet = profile.dietaryPreferences?.length ? profile.dietaryPreferences.join(', ') : 'None specified';

  return `You are an expert nutritionist and food scientist. Generate a personalized list of food ingredients/additives that are specifically relevant to this user's health profile.

User's Health Profile:
- Allergies: ${allergies}
- Intolerances: ${intolerances}
- Medical Conditions: ${conditions}
- Dietary Preferences: ${diet}

Instructions:
1. Generate 15-25 ingredients/additives that this user should know about based on their specific profile.
2. For each allergen the user has, include the primary allergen ingredient AND 2-3 related/cross-reactive ingredients.
3. For each medical condition, include ingredients that could worsen it AND safe alternatives.
4. For dietary preferences (e.g., Halal, Vegan), include common non-compliant ingredients.
5. Include some universally important additives (preservatives, colorings) with their E-numbers if applicable.
6. Classify each as: "Safe" (no concern for this user), "Flagged" (potential concern, should be aware), or "Allergen" (direct match with user's allergies/conditions).
7. Provide a clear reason WHY each ingredient has its status, referencing the user's specific profile.
8. The 'description' MUST be comprehensive and educational (at least 2-3 full sentences). Explain what it is, how it is made, and its effects.
9. For 'commonlyFoundIn', the 'icon' field MUST be exactly ONE single Unicode emoji character (e.g., 🥜, 🍪, 🥣). Do not use text for the icon.
10. You MUST return ONLY valid JSON matching the exact schema provided. Do not include markdown formatting or extra text.
`;
}

export const INGREDIENTS_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ingredientName: { type: "string" },
          category: { type: "string" },
          status: { type: "string", enum: ["Safe", "Flagged", "Allergen"] },
          reason: { type: "string" },
          description: { type: "string" },
          commonlyFoundIn: {
            type: "array",
            items: {
              type: "object",
              properties: {
                icon: { type: "string" },
                label: { type: "string" }
              },
              required: ["icon", "label"]
            }
          }
        },
        required: ["ingredientName", "category", "status", "reason", "description", "commonlyFoundIn"]
      }
    }
  },
  required: ["ingredients"]
};

