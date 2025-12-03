import type { SupportedLanguage } from './translations';

type TemplateConfig = {
  name: string;
  locale: string;
};

const DEFAULT_TEMPLATE: TemplateConfig = {
  name: 'new_look_ready',
  locale: 'en_US',
};

const TEMPLATE_MAP: Partial<Record<SupportedLanguage, TemplateConfig>> = {
  en: DEFAULT_TEMPLATE,
  tr: { name: 'new_look_ready_tr', locale: 'tr' },
  fr: { name: 'new_look_ready_fr', locale: 'fr' },
  ru: { name: 'new_look_ready_rs', locale: 'ru' },
  ar: { name: 'new_look_ready_ar', locale: 'ar' },
  es: { name: 'new_look_ready_es', locale: 'es' },
  it: { name: 'new_look_ready_it', locale: 'it' },
  zh: { name: 'new_look_ready_ch', locale: 'zh_CN' },
};

export function getWhatsappTemplateConfig(
  language?: string
): TemplateConfig {
  if (!language) {
    return DEFAULT_TEMPLATE;
  }
  const code = language as SupportedLanguage;
  return TEMPLATE_MAP[code] ?? DEFAULT_TEMPLATE;
}
