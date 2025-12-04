'use client';

import {
  FALLBACK_LANGUAGE,
  LANGUAGE_ALIASES,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  TRANSLATIONS,
  TranslationKey,
} from './translations';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'nc-language';

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, replacements?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const isSupported = (value: string): value is SupportedLanguage =>
  SUPPORTED_LANGUAGES.some((lang) => lang.code === value);

const formatString = (
  template: string,
  replacements?: Record<string, string>
) =>
  template.replace(/{{(.*?)}}/g, (_, token) =>
    replacements?.[token.trim()] ?? ''
  );

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(FALLBACK_LANGUAGE);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const segments = pathname?.split('/').filter(Boolean) ?? [];
    const pathLang = segments[0];
    if (pathLang && isSupported(pathLang)) {
      setLanguageState(pathLang as SupportedLanguage);
      document.documentElement.lang = pathLang;
      window.localStorage.setItem(STORAGE_KEY, pathLang);
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) {
      setLanguageState(stored);
      document.documentElement.lang = stored;
      return;
    }

    const detected = (() => {
      const navigatorLang = navigator.language;
      const normalized = navigatorLang?.toLowerCase();
      if (normalized && isSupported(normalized as SupportedLanguage)) {
        return normalized as SupportedLanguage;
      }
      const short = normalized?.split('-')[0];
      if (short && isSupported(short as SupportedLanguage)) {
        return short as SupportedLanguage;
      }
      return FALLBACK_LANGUAGE;
    })();
    setLanguageState(detected);
    document.documentElement.lang = detected;
    window.localStorage.setItem(STORAGE_KEY, detected);
  }, [pathname]);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string>) => {
      const entry = TRANSLATIONS[key];
      if (!entry) return key;
      const template = entry[language] ?? entry[FALLBACK_LANGUAGE] ?? key;
      return formatString(template, replacements);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export { SUPPORTED_LANGUAGES };
