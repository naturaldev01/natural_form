'use client';

import Image from 'next/image';
import ConsultationForm from '@/components/ConsultationForm';
// ResultsDisplay şimdilik devre dışı - component dosyası korunuyor
// import ResultsDisplay from '@/components/ResultsDisplay';

interface ConsultationResultPayload {
  results: { originalUrl: string; transformedUrl: string }[];
  preferences?: {
    teethShade?: string;
    teethStyle?: string;
  };
}

export default function Home() {
  // ResultsDisplay devre dışı olduğu için handleSuccess şimdilik sadece log yapıyor
  const handleSuccess = (data: ConsultationResultPayload) => {
    // Şimdilik hiçbir şey yapma - ResultsDisplay ekranı devre dışı
    console.log('Form submitted successfully', data);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center items-start mb-6 gap-3">
              <Image
                src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
                alt="Natural Clinic logo"
                width={240}
                height={80}
                priority
              />
              <div className="flex flex-col items-start pt-2">
                <span className="text-[#006069] text-lg font-semibold tracking-wide">
                  Design Studio
                </span>
              </div>
            </div>
            <p className="text-xl text-gray-800">
              Discover Your Perfect Transformation
            </p>
            <p className="text-gray-600 mt-2">
              See how our treatments can enhance your natural beauty
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl border border-gray-100 relative overflow-hidden">
            <ConsultationForm onSuccess={handleSuccess} />
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Your privacy is important to us. All images are securely stored and processed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
