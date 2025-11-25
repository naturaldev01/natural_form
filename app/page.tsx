'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              natural.clinic
            </h1>
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

