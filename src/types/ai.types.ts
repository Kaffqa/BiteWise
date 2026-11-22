import { SafetyStatus, ScanType } from './database.types';

/**
 * Represents a health warning based on user profile and food analysis
 */
export interface HealthWarning {
  type: 'allergy' | 'intolerance' | 'condition' | 'dietary';
  severity: 'danger' | 'caution' | 'info';
  title: string;
  detail: string;
  matchedIngredient?: string;
}

/**
 * Details of a specific food item detected in a scan
 */
export interface DetectedFoodItem {
  name: string;
  estimatedWeightG: number;
  portionDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  detectedAllergens: string[];
  safetyStatus: SafetyStatus;
}

/**
 * Aggregated nutritional data
 */
export interface NutritionData {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

/**
 * Explanation of an ingredient and its potential risks
 */
export interface IngredientExplanation {
  name: string;
  scientificName?: string;
  commonName: string;
  description: string;
  riskLevel: 'none' | 'low' | 'moderate' | 'high';
  relevantConditions: string[];
}

/**
 * Smart Swap alternative suggestion
 */
export interface SmartSwapAlternative {
  originalItem: string;
  alternativeName: string;
  reason: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  safetyStatus: 'safe' | 'caution';
  tags: string[]; // e.g. ['lower-calorie', 'allergen-free', 'local']
}

/**
 * Food-Drug interaction warning
 */
export interface DrugInteraction {
  medication: string;
  interactingIngredient: string;
  severity: 'low' | 'moderate' | 'severe';
  mechanism: string;
  recommendation: string;
  source?: string;
}

/**
 * Glycemic spike simulation data point
 */
export interface GlycemicDataPoint {
  minutesAfterEating: number;
  glucoseMgDl: number;
}

/**
 * Glycemic analysis for the meal
 */
export interface GlycemicAnalysis {
  estimatedGI: number; // 0-100
  glycemicLoad: number;
  spikeLevel: 'low' | 'moderate' | 'high';
  peakGlucoseMgDl: number;
  timeToBaselineMinutes: number;
  curveDataPoints: GlycemicDataPoint[];
  tipToReduceSpike: string;
  fiberMitigationFactor?: number; // 0-1, how much fiber/protein reduces the spike
}

/**
 * Full result object returned from the AI food analysis
 */
export interface FoodAnalysisResult {
  scanType: ScanType;
  mealTitle: string;
  confidenceScore: number;
  safetyStatus: SafetyStatus;
  healthWarnings: HealthWarning[];
  items: DetectedFoodItem[];
  totalNutrition: NutritionData;
  ingredientExplanations: IngredientExplanation[];
  recommendations: string[];
  dailyImpact?: DailyImpact;
  // === NEW 3 FEATURES ===
  smartAlternatives?: SmartSwapAlternative[];
  drugInteractions?: DrugInteraction[];
  glycemicAnalysis?: GlycemicAnalysis;
  rawResponse?: unknown;
  processingTimeMs: number;
  modelVersion?: string;
}

/**
 * Subset of user profile needed for accurate AI analysis
 */
export interface UserHealthProfile {
  allergies: string[];
  intolerances: string[];
  medicalConditions: string[];
  dietaryPreferences: string[];
  medications?: string[];
  targetCalories: number | null;
  targetSodiumMg: number | null;
  targetSugarG: number | null;
}

/**
 * Data representing the user's already-consumed nutrition for the current day.
 */
export interface ConsumedToday {
  calories: number;
  sodiumMg: number;
  sugarG: number;
}

/**
 * AI-generated daily impact analysis comparing this meal against remaining daily allowance.
 */
export interface DailyImpact {
  caloriesConsumedBefore: number;
  caloriesAfterThisMeal: number;
  caloriesRemaining: number;
  percentageOfDailyTarget: number;
  exceedsLimit: boolean;
  summary: string;
}

/**
 * Interface for AI service providers
 */
export interface AIProvider {
  name: string;
  analyzeFood(imageBase64: string, userProfile: UserHealthProfile, consumedToday?: ConsumedToday): Promise<FoodAnalysisResult>;
  analyzeText(description: string, userProfile: UserHealthProfile): Promise<FoodAnalysisResult>;
  generateIngredients?(userProfile: UserHealthProfile): Promise<any[]>;
  enrichIngredients?(ingredientNames: string[], userProfile: UserHealthProfile): Promise<any[]>;
}
