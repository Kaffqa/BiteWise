import type { AIProvider, ConsumedToday, FoodAnalysisResult, UserHealthProfile } from '@/types/ai.types';
import { supabase } from '@/lib/supabase';
import { validateAndNormalizeFoodAnalysis } from '@/lib/ai-schema';
import { getActiveLanguage, getDictionary, interpolate } from '@/i18n';

const CLIENT_TIMEOUT_MS = 35_000;

/**
 * Client-side AI provider that delegates all AI requests to the authenticated
 * serverless proxy (/api/ai) so API keys never enter the browser bundle.
 */
export class ProxyProvider implements AIProvider {
  name = 'server-proxy';

  private async postAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const t = getDictionary();
    const language = getActiveLanguage();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error(t.errors.authRequired);
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
        body: JSON.stringify({ action, language, ...payload }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const preview = await response.text().catch(() => '');
        const cleanPreview = preview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
        throw new Error(
          interpolate(t.errors.nonJsonProxy, {
            status: response.status,
            preview: cleanPreview || response.statusText,
          })
        );
      }

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || interpolate(t.errors.aiFailed, { status: response.status }));
      }

      return json.data as T;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(t.errors.aiTimedOut);
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
