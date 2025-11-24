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
    <div className="min-h-screen bg-white text-gray-900">
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
              
            <p className="text-xl text-gray-800">
              Discover Your Perfect Transformation
            </p>
            <p className="text-gray-600 mt-2">
              See how our treatments can enhance your natural beauty
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl border border-gray-100">
            {results ? (
              <ResultsDisplay
                results={results}
                onReset={handleReset}
              />
            ) : (
              <ConsultationForm onSuccess={handleSuccess} />
            )}
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Your privacy is important to us. All images are securely stored and processed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
