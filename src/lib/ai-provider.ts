import type { AIProvider, FoodAnalysisResult, UserHealthProfile, ConsumedToday } from '@/types/ai.types';
import { ProxyProvider } from './providers/proxy-provider';

/**
 * Creates the AI provider instance routed through the server-side /api/ai proxy.
 */
export function createAIProvider(): AIProvider {
  return new ProxyProvider();
}

let _provider: ProxyProvider | null = null;

/**
 * Returns the configured AI provider singleton.
 */
export function getAIProvider(): ProxyProvider {
  if (!_provider) {
    _provider = new ProxyProvider();
  }
  return _provider;
}

/**
 * Analyzes food image through the authenticated /api/ai proxy.
 */
export async function analyzeFood(
  imageBase64: string,
  userProfile: UserHealthProfile,
  consumedToday?: ConsumedToday
): Promise<FoodAnalysisResult> {
  return getAIProvider().analyzeFood(imageBase64, userProfile, consumedToday);
}

/**
 * Analyzes text meal description through the authenticated /api/ai proxy.
 */
export async function analyzeText(
  description: string,
  userProfile: UserHealthProfile,
  consumedToday?: ConsumedToday
): Promise<FoodAnalysisResult> {
  return getAIProvider().analyzeText(description, userProfile, consumedToday);
}

/**
 * Generates personalized ingredients using the configured AI provider.
 */
export async function generatePersonalIngredients(
  userProfile: UserHealthProfile
): Promise<any[]> {
  return getAIProvider().generateIngredients(userProfile);
}

/**
 * Enriches detected ingredients using the configured AI provider.
 */
export async function enrichIngredients(
  ingredientNames: string[],
  userProfile: UserHealthProfile
): Promise<any[]> {
  return getAIProvider().enrichIngredients(ingredientNames, userProfile);
}
