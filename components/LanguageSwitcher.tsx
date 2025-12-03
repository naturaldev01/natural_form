'use client';

import { SUPPORTED_LANGUAGES, useI18n } from '@/lib/i18n';
import type { SupportedLanguage } from '@/lib/i18n/translations';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex items-center justify-end gap-2">
      <label
        htmlFor="language-switcher"
        className="text-xs sm:text-sm font-medium text-gray-600"
      >
       
      </label>
      <select
        id="language-switcher"
        value={language}
        onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
        className="rounded-xl border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006069]"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
