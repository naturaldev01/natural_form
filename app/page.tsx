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
  const [contactInfo, setContactInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const handleSuccess = (payload: {
    results: { originalUrl: string; transformedUrl: string }[];
    contact: { firstName: string; lastName: string; email: string; phone: string };
  }) => {
    setResults(payload.results);
    setContactInfo(payload.contact);
    setShowSummary(true);
  };

  const handleReset = () => {
    setResults(null);
    setContactInfo(null);
    setShowSummary(false);
  };

  return (
    <>
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
                  contact={contactInfo}
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

      {showSummary && contactInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-[#006069] uppercase tracking-wide">
                Consultation Details
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">Thank you, {contactInfo.firstName}!</h3>
              <p className="text-gray-600 mt-1">Here is a quick summary before viewing your transformation.</p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-xs uppercase text-gray-400 tracking-wide">Full Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {contactInfo.firstName} {contactInfo.lastName}
                </p>
              </div>
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-xs uppercase text-gray-400 tracking-wide">Email</p>
                <p className="text-lg font-semibold text-gray-900">{contactInfo.email}</p>
              </div>
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-xs uppercase text-gray-400 tracking-wide">Phone</p>
                <p className="text-lg font-semibold text-gray-900">{contactInfo.phone}</p>
              </div>
            </div>

            <button
              onClick={() => setShowSummary(false)}
              className="w-full py-3 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-lg transition-all"
            >
              View My Transformation
            </button>
          </div>
        </div>
      )}
    </>
  );
}
