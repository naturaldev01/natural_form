'use client';

import Image from 'next/image';
import ConsultationForm from '@/components/ConsultationForm';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

interface LandingPageProps {
  initialTreatmentType?: 'teeth' | 'hair';
}

export default function LandingPage({ initialTreatmentType = 'teeth' }: LandingPageProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <div className="w-full max-w-4xl mx-auto px-4 pt-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <main className="flex-1 w-full px-4 py-4 sm:py-8">
        <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="text-center space-y-2.5 sm:space-y-3">
            <div className="flex justify-center items-start gap-3 flex-wrap">
              <Image
                src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
                alt="Natural Clinic logo"
                width={200}
                height={68}
                priority
              />
              <div className="flex flex-col items-start pt-2">
                <span className="text-[#006069] text-lg font-semibold tracking-wide">
                  {t('hero.badge')}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl text-gray-800">{t('hero.title')}</p>
              <p className="text-gray-600 text-[11px] sm:text-sm">{t('hero.subtitle')}</p>
            </div>
           
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-5 md:p-8 shadow-2xl border border-gray-100">
            <div className="h-full">
              <ConsultationForm initialTreatmentType={initialTreatmentType} />
            </div>
          </div>

          <div className="text-center text-gray-500 text-[11px] sm:text-sm">
            <p>{t('hero.privacy')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
