'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  treatmentType: 'teeth' | 'hair';
  teethShade: string;
  teethStyle: string;
  images: File[];
}

interface ConsultationResultPayload {
  results: { originalUrl: string; transformedUrl: string }[];
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  preferences?: {
    teethShade?: string;
    teethStyle?: string;
  };
}

interface ConsultationFormProps {
  onSuccess: (data: ConsultationResultPayload) => void;
}

const TEETH_SHADES = [
  { value: '0M1', label: '0M1 – brightest bleach' },
  { value: '0M2', label: '0M2 – intense bleach' },
  { value: '0M3', label: '0M3 – natural bleach' },
  { value: 'A1', label: 'A1 – soft reddish brown' },
  { value: 'A2', label: 'A2 – warm natural' },
  { value: 'A3', label: 'A3 – balanced natural' },
  { value: 'A3.5', label: 'A3.5 – deeper natural' },
  { value: 'A4', label: 'A4 – rich brownish' },
  { value: 'B1', label: 'B1 – bright yellowish' },
  { value: 'B2', label: 'B2 – creamy yellowish' },
  { value: 'B3', label: 'B3 – honey yellowish' },
  { value: 'B4', label: 'B4 – golden yellowish' },
  { value: 'C1', label: 'C1 – soft grey' },
  { value: 'C2', label: 'C2 – medium grey' },
  { value: 'C3', label: 'C3 – deep grey' },
  { value: 'C4', label: 'C4 – charcoal grey' },
  { value: 'D2', label: 'D2 – cool reddish-grey' },
  { value: 'D3', label: 'D3 – medium reddish-grey' },
  { value: 'D4', label: 'D4 – deep reddish-grey' },
];

const TEETH_STYLES = [
  'AggressiveStyle',
  'DominantStyle',
  'EnhancedStyle',
  'FocusedStyle',
  'FunctionalStyle',
  'HollywoodStyle',
  'MatureStyle',
  'NaturalStyle',
  'OvalStyle',
  'SoftenedStyle',
  'VigorousStyle',
  'YouthfulStyle',
].map((value) => ({
  value,
  label: value.replace(/([A-Z])/g, ' $1').replace(/Style$/, ' Style').trim(),
}));

export default function ConsultationForm({ onSuccess }: ConsultationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    treatmentType: 'teeth',
    teethShade: '',
    teethStyle: '',
    images: [],
  });
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalError, setContactModalError] = useState<string | null>(null);
  const [showShadeGuide, setShowShadeGuide] = useState(false);
  const [showStyleGuide, setShowStyleGuide] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Some images are too large (max 5MB): ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      const newImages = [...formData.images, ...validFiles];
      setFormData({ ...formData, images: newImages });

      // Create previews for new files
      const previewPromises = validFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then((newPreviews) => {
        setPreviews([...previews, ...newPreviews]);
      });

      setError(null);
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
    setPreviews(newPreviews);
  };

  const isContactInfoComplete = () => {
    return [formData.firstName, formData.lastName, formData.email, formData.phone].every(
      (field) => field.trim().length > 0
    );
  };

  const submitForm = async () => {
    if (!consentAccepted) {
      setError('Please accept the consent to proceed');
      return;
    }

    if (formData.images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (
      formData.treatmentType === 'teeth' &&
      (!formData.teethShade || !formData.teethStyle)
    ) {
      setError('Please choose a teeth color and smile style');
      return;
    }

    if (!isContactInfoComplete()) {
      setContactModalError(null);
      setShowContactModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results: { originalUrl: string; transformedUrl: string }[] = [];

      for (let i = 0; i < formData.images.length; i++) {
        const image = formData.images[i];
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `consultations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('consultation-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('consultation-images').getPublicUrl(filePath);

        const transformResponse = await fetch('/api/transform-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: publicUrl,
            treatmentType: formData.treatmentType,
            teethShade: formData.treatmentType === 'teeth' ? formData.teethShade : undefined,
            teethStyle: formData.treatmentType === 'teeth' ? formData.teethStyle : undefined,
          }),
        });

        let transformData:
          | { transformedUrl?: string; error?: string; message?: string; warning?: string }
          | null = null;
        try {
          transformData = await transformResponse.json();
        } catch {
          transformData = null;
        }

        if (!transformResponse.ok || !transformData?.transformedUrl) {
          const errorMessage =
            transformData?.error || transformData?.message || `Failed to transform image ${i + 1}`;
          throw new Error(errorMessage);
        }

        const transformedUrl = transformData.transformedUrl;
        results.push({ originalUrl: publicUrl, transformedUrl });

        const { error: dbError } = await supabase.from('consultations').insert({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          treatment_type: formData.treatmentType,
          original_image_url: publicUrl,
          transformed_image_url: transformedUrl,
        });

        if (dbError) throw dbError;
      }

      onSuccess({
        results,
        contact: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
        preferences:
          formData.treatmentType === 'teeth'
            ? {
                teethShade: formData.teethShade,
                teethStyle: formData.teethStyle,
              }
            : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  const handleContactContinue = async () => {
    if (!isContactInfoComplete()) {
      setContactModalError('Please fill out all contact details');
      return;
    }

    setContactModalError(null);
    setShowContactModal(false);
    await submitForm();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
          <p className="font-medium text-gray-900">Step 1: Upload your photos</p>
          <p className="mt-1 text-gray-600">
            We&apos;ll collect your name, email, and phone after you click &quot;Get Your Transformation&quot; so we
            can send your results securely.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Treatment Type
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, treatmentType: 'teeth' })}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                formData.treatmentType === 'teeth'
                  ? 'bg-[#006069] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Teeth
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  treatmentType: 'hair',
                  teethShade: '',
                  teethStyle: '',
                })
              }
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                formData.treatmentType === 'hair'
                  ? 'bg-[#006069] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Hair
            </button>
          </div>
        </div>

        {formData.treatmentType === 'teeth' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="teethShade" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Color
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Matches the VITA color guide from bleach (0M) to natural (A-D).
                  <button
                    type="button"
                    onClick={() => setShowShadeGuide(true)}
                    className="ml-2 text-[#006069] underline font-semibold"
                  >
                    View chart
                  </button>
                </p>
                <select
                  id="teethShade"
                  required
                  value={formData.teethShade}
                  onChange={(e) => setFormData({ ...formData, teethShade: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                >
                  <option value="">Select Color</option>
                  {TEETH_SHADES.map((shade) => (
                    <option key={shade.value} value={shade.value}>
                      {shade.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="teethStyle" className="block text-sm font-medium text-gray-700 mb-2">
                  Smile Style
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Choose the tooth shape inspiration that matches your goal.
                  <button
                    type="button"
                    onClick={() => setShowStyleGuide(true)}
                    className="ml-2 text-[#006069] underline font-semibold"
                  >
                    View gallery
                  </button>
                </p>
                <select
                  id="teethStyle"
                  required
                  value={formData.teethStyle}
                  onChange={(e) => setFormData({ ...formData, teethStyle: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                >
                  <option value="">Select Style</option>
                  {TEETH_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload Photos {formData.images.length > 0 && `(${formData.images.length} selected)`}
        </label>
          <div className="relative">
            <input
              type="file"
              id="image"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              required={formData.images.length === 0}
              className="hidden"
            />
            <label
              htmlFor="image"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all"
            >
              {previews.length > 0 ? (
                <div className="w-full h-full p-4 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-[#006069] mb-4" />
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB per image)</p>
                  <p className="text-xs text-gray-400 mt-1">You can select multiple images</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="checkbox"
            id="consent"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            required
            className="mt-1 w-5 h-5 text-[#006069] bg-white border-gray-300 rounded focus:ring-[#006069] focus:ring-2"
          />
          <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
            I consent to the processing of my personal information and photos for consultation purposes. 
            I understand that my data will be stored securely and used only for providing consultation services.
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !consentAccepted || formData.images.length === 0}
          className="w-full py-4 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Get Your Transformation'
          )}
        </button>
      </form>

      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold text-[#006069] uppercase tracking-wide">Step 2</p>
              <h3 className="text-2xl font-bold text-gray-900">Tell us about you</h3>
              <p className="text-gray-600">We&apos;ll use this information to send your personalized results.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal-first-name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="modal-first-name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label htmlFor="modal-last-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="modal-last-name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="modal-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label htmlFor="modal-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="modal-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            {contactModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {contactModalError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowContactModal(false);
                  setContactModalError(null);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContactContinue}
                className="w-full sm:w-auto px-5 py-3 rounded-lg bg-[#006069] hover:bg-[#004750] text-white font-semibold transition-all disabled:opacity-50"
                disabled={loading}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showShadeGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#006069] uppercase tracking-wide">Reference</p>
                <h3 className="text-2xl font-bold text-gray-900">Teeth Color Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShadeGuide(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label="Close color guide"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600">
              0M tones are brightest bleach colors, A/B are warm natural tones, C is grey, and D is a cool reddish-grey.
            </p>
            <div className="overflow-auto max-h-[70vh] rounded-xl border border-gray-200">
              <Image
                src="/assets/teeth_colors.jpeg"
                alt="Full teeth color guide"
                width={1000}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {showStyleGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#006069] uppercase tracking-wide">Reference</p>
                <h3 className="text-2xl font-bold text-gray-900">Smile Style Gallery</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStyleGuide(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label="Close style guide"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Compare each tooth shape inspiration so you can pick the closest match for your transformation.
            </p>
            <div className="overflow-auto max-h-[70vh] rounded-xl border border-gray-200">
              <Image
                src="/assets/teeth_styles.jpeg"
                alt="Smile style gallery"
                width={1000}
                height={1200}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
