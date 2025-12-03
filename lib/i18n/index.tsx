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

const STORAGE_KEY = 'nc-language';

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, replacements?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const isSupported = (value: string): value is SupportedLanguage =>
  SUPPORTED_LANGUAGES.some((lang) => lang.code === value);

const resolveLanguage = (raw?: string): SupportedLanguage => {
  if (!raw) return FALLBACK_LANGUAGE;
  const normalized = raw.toLowerCase();
  const alias = LANGUAGE_ALIASES[normalized];
  if (alias && isSupported(alias)) return alias;
  if (isSupported(normalized as SupportedLanguage)) {
    return normalized as SupportedLanguage;
  }
  const short = normalized.split('-')[0];
  if (isSupported(short as SupportedLanguage)) {
    return short as SupportedLanguage;
  }
  return FALLBACK_LANGUAGE;
};

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) {
      setLanguageState(stored);
      document.documentElement.lang = stored;
      return;
    }
    const detected = resolveLanguage(navigator.language);
    setLanguageState(detected);
    document.documentElement.lang = detected;
    window.localStorage.setItem(STORAGE_KEY, detected);
  }, []);

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
