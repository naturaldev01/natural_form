'use client';

import Image from 'next/image';
import Link from 'next/link';
import ConsultationForm from '@/components/ConsultationForm';

interface LandingPageProps {
  initialTreatmentType?: 'teeth' | 'hair';
}

export default function LandingPage({ initialTreatmentType = 'teeth' }: LandingPageProps) {
  const linkBase =
    'inline-flex items-center gap-1 font-semibold transition-colors hover:text-[#004750]';

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col overflow-hidden">
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-4xl space-y-4 sm:space-y-5">
          <div className="text-center space-y-3">
            <div className="flex justify-center items-start gap-3">
              <Image
                src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
                alt="Natural Clinic logo"
                width={200}
                height={68}
                priority
              />
              <div className="flex flex-col items-start pt-2">
                <span className="text-[#006069] text-lg font-semibold tracking-wide">
                  Design Studio
                </span>
              </div>
            </div>
            <div>
              <p className="text-xl text-gray-800">Discover Your Perfect Transformation</p>
              <p className="text-gray-600 mt-1">
                See how our treatments can enhance your natural beauty
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Explore dedicated experiences:{' '}
              <Link
                href="/teeth"
                prefetch={false}
                className={`${linkBase} ${
                  initialTreatmentType === 'teeth' ? 'text-[#006069]' : 'text-gray-600'
                }`}
              >
                Teeth Preview
              </Link>
              <span className="mx-1 text-gray-400">/</span>
              <Link
                href="/hair"
                prefetch={false}
                className={`${linkBase} ${
                  initialTreatmentType === 'hair' ? 'text-[#006069]' : 'text-gray-600'
                }`}
              >
                Hair Preview
              </Link>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 md:p-8 shadow-2xl border border-gray-100 relative overflow-hidden max-h-[calc(100svh-170px)]">
            <div className="h-full overflow-y-auto pr-1">
              <ConsultationForm initialTreatmentType={initialTreatmentType} />
            </div>
          </div>

          <div className="text-center text-gray-500 text-xs sm:text-sm">
            <p>Your privacy is important to us. All images are securely stored and processed.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
