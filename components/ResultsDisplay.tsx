'use client';

import { ArrowRight, Download } from 'lucide-react';

interface Result {
  originalUrl: string;
  transformedUrl: string;
}

interface ResultsDisplayProps {
  results: Result[];
  onReset: () => void;
}

export default function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  const downloadAll = () => {
    results.forEach((result, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = result.transformedUrl;
        link.download = `transformed-${index + 1}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Transformation{results.length > 1 ? 's' : ''}</h2>
        <p className="text-gray-600">See the difference our treatment can make</p>
      </div>

      <div className="space-y-8">
        {results.map((result, index) => (
          <div key={index} className="space-y-4">
            {results.length > 1 && (
              <h3 className="text-lg font-semibold text-gray-700">Image {index + 1}</h3>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-700">Before</h4>
                <div className="relative rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={result.originalUrl}
                    alt={`Original ${index + 1}`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="hidden lg:flex justify-center">
                <ArrowRight className="w-12 h-12 text-[#006069]" />
              </div>

              <div className="space-y-3 lg:col-start-2">
                <h4 className="text-md font-semibold text-gray-700">After</h4>
                <div className="relative rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={result.transformedUrl}
                    alt={`Transformed ${index + 1}`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {results.length > 1 ? (
          <button
            onClick={downloadAll}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download All Results
          </button>
        ) : (
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = results[0].transformedUrl;
              link.download = `transformed-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download Result
          </button>
        )}
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-all"
        >
          Start New Consultation
        </button>
      </div>
    </div>
  );
}
