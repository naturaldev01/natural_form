'use client';

import { SUPPORTED_LANGUAGES, useI18n } from '@/lib/i18n';
import type { SupportedLanguage } from '@/lib/i18n/translations';
import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLang = event.target.value as SupportedLanguage;
    setLanguage(nextLang);

    const segments = pathname?.split('/').filter(Boolean) ?? [];
    const currentIsLang = segments[0] && SUPPORTED_LANGUAGES.some((lang) => lang.code === segments[0]);
    if (currentIsLang) {
      segments[0] = nextLang;
    } else {
      segments.unshift(nextLang);
    }
    const nextPath = `/${segments.join('/')}`;
    router.push(nextPath, { scroll: false });
  };

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
        onChange={handleChange}
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
