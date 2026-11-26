import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { enUS, id as idLocale, type Locale } from 'date-fns/locale';
import {
  getActiveLanguage,
  getDictionary,
  interpolate,
  translateDomainValue,
  LANGUAGE_STORAGE_KEY,
  type Language,
  type TranslationDictionary,
} from '@/i18n';
import { supabase } from '@/lib/supabase';

interface LanguageContextValue {
  lang: Language;
  setLanguage: (nextLang: Language) => void;
  t: TranslationDictionary;
  formatText: (template: string, vars?: Record<string, string | number | null | undefined>) => string;
  tDomain: (
    category:
      | 'gender'
      | 'activityLevel'
      | 'activityDesc'
      | 'goal'
      | 'mealType'
      | 'safetyStatus'
      | 'severity'
      | 'spikeLevel'
      | 'tags',
    rawValue: string | null | undefined
  ) => string;
  dateLocale: Locale;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Provides active UI/AI language ('en' | 'id'), persistence across reload & Supabase metadata,
 * and typed translation helpers for the entire platform.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => getActiveLanguage());

  // Keep <html lang>, document title, and meta description synced with active language
  useEffect(() => {
    const dict = getDictionary(lang);
    document.documentElement.lang = lang;
    document.title = dict.meta.title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', dict.meta.description);
    }
  }, [lang]);

  // Restore user_metadata language preference once authenticated if localStorage wasn't explicitly changed yet
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const metaLang = session?.user?.user_metadata?.preferred_language;
      let hasLocal = false;
      try {
        hasLocal = Boolean(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
      } catch {
        hasLocal = false;
      }
      if (!hasLocal && (metaLang === 'id' || metaLang === 'en')) {
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, metaLang);
        } catch {
          // ignore
        }
        setLangState(metaLang);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const metaLang = session?.user?.user_metadata?.preferred_language;
      if (metaLang === 'id' || metaLang === 'en') {
        let currentLocal: string | null = null;
        try {
          currentLocal = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        } catch {
          currentLocal = null;
        }
        if (!currentLocal) {
          try {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, metaLang);
          } catch {
            // ignore
          }
          setLangState(metaLang);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage errors
    }

    // Best-effort cloud sync to Supabase user_metadata (no DB migration required)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.auth.updateUser({ data: { preferred_language: nextLang } }).catch(() => undefined);
      }
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t = getDictionary(lang);
    return {
      lang,
      setLanguage,
      t,
      formatText: interpolate,
      tDomain: (category, rawValue) => translateDomainValue(lang, category, rawValue),
      dateLocale: lang === 'id' ? idLocale : enUS,
    };
  }, [lang, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Hook to access current language, dictionary (`t`), domain mapper, and `date-fns` locale.
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
