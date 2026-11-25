import type { AIProvider, ConsumedToday, FoodAnalysisResult, UserHealthProfile } from '@/types/ai.types';
import { supabase } from '@/lib/supabase';
import { validateAndNormalizeFoodAnalysis } from '@/lib/ai-schema';

const CLIENT_TIMEOUT_MS = 35_000;

/**
 * Client-side AI provider that delegates all AI requests to the authenticated
 * serverless proxy (/api/ai) so API keys never enter the browser bundle.
 */
export class ProxyProvider implements AIProvider {
  name = 'server-proxy';

  private async postAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Authentication required before calling AI analysis.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('AI proxy returned an invalid non-JSON response.');
      }

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `AI request failed (${response.status})`);
      }

      return json.data as T;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('AI analysis timed out after 35s. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async analyzeFood(
    imageBase64: string,
    userProfile: UserHealthProfile,
    consumedToday?: ConsumedToday
  ): Promise<FoodAnalysisResult> {
    const raw = await this.postAction<unknown>('analyzeFood', {
      imageBase64,
      userProfile,
      consumedToday,
    });
    return validateAndNormalizeFoodAnalysis(raw);
  }

  async analyzeText(
    description: string,
    userProfile: UserHealthProfile,
    consumedToday?: ConsumedToday
  ): Promise<FoodAnalysisResult> {
    const raw = await this.postAction<unknown>('analyzeText', {
      description,
      userProfile,
      consumedToday,
    });
    return validateAndNormalizeFoodAnalysis(raw);
  }

  async generateIngredients(userProfile: UserHealthProfile): Promise<any[]> {
    const res = await this.postAction<any[]>('generateIngredients', { userProfile });
    return Array.isArray(res) ? res : [];
  }

  async enrichIngredients(ingredientNames: string[], userProfile: UserHealthProfile): Promise<any[]> {
    const res = await this.postAction<any[]>('enrichIngredients', {
      ingredientNames,
      userProfile,
    });
    return Array.isArray(res) ? res : [];
  }
}
