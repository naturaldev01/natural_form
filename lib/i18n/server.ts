import {
  FALLBACK_LANGUAGE,
  LANGUAGE_ALIASES,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from './translations';

const isSupported = (value: string): value is SupportedLanguage =>
  SUPPORTED_LANGUAGES.some((lang) => lang.code === value);

export const resolveLanguage = (raw?: string): SupportedLanguage => {
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
