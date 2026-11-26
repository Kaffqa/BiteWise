import { en } from './en';
import { id } from './id';
import type { Language, TranslationDictionary } from './types';

export type { Language, TranslationDictionary } from './types';

export const LANGUAGE_STORAGE_KEY = 'bitewise_language';

const DICTIONARIES: Record<Language, TranslationDictionary> = {
  en,
  id,
};

/**
 * Reads the persisted UI language safely from localStorage (defaults to 'en').
 */
export function getActiveLanguage(): Language {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'id' || stored === 'en') {
        return stored;
      }
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'en';
}

export function getDictionary(lang: Language = getActiveLanguage()): TranslationDictionary {
  return DICTIONARIES[lang] || DICTIONARIES.en;
}

/**
 * Replaces `{{key}}` placeholders inside a translation template string.
 */
export function interpolate(
  template: string,
  vars?: Record<string, string | number | null | undefined>
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

type DomainCategory =
  | 'gender'
  | 'activityLevel'
  | 'activityDesc'
  | 'goal'
  | 'mealType'
  | 'safetyStatus'
  | 'severity'
  | 'spikeLevel'
  | 'tags';

function snakeToTitleFallback(str: string): string {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Translates canonical DB enum keys or preset tags to the active display language
 * without altering the stored canonical value sent to PostgreSQL triggers.
 */
export function translateDomainValue(
  lang: Language,
  category: DomainCategory,
  rawValue: string | null | undefined
): string {
  const dict = getDictionary(lang);
  if (!rawValue) return dict.common.notSet;

  const map = dict.domain[category] as Record<string, string>;
  if (map[rawValue]) return map[rawValue];

  const normalized = rawValue.trim().toLowerCase();
  const matchedKey = Object.keys(map).find((k) => k.toLowerCase() === normalized);
  if (matchedKey) return map[matchedKey];

  return rawValue.includes('_') ? snakeToTitleFallback(rawValue) : rawValue;
}
