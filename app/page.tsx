'use client';

import { useState } from 'react';
import Image from 'next/image';
import ConsultationForm from '@/components/ConsultationForm';
import ResultsDisplay from '@/components/ResultsDisplay';

export default function Home() {
  const [results, setResults] = useState<{
    originalUrl: string;
    transformedUrl: string;
  }[] | null>(null);

  const handleSuccess = (data: { originalUrl: string; transformedUrl: string }[]) => {
    setResults(data);
  };

  const handleReset = () => {
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004750] via-[#006069] to-[#004750]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Image
                src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
                alt="Natural Clinic logo"
                width={240}
                height={80}
                priority
              />
            </div>
              
            <p className="text-xl text-white/80">
              Discover Your Perfect Transformation
            </p>
            <p className="text-white/60 mt-2">
              See how our treatments can enhance your natural beauty
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 shadow-2xl border border-white/20">
            {results ? (
              <ResultsDisplay
                results={results}
                onReset={handleReset}
              />
            ) : (
              <ConsultationForm onSuccess={handleSuccess} />
            )}
          </div>

          <div className="mt-8 text-center text-white/50 text-sm">
            <p>Your privacy is important to us. All images are securely stored and processed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
