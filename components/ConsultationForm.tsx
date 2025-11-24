'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  treatmentType: 'teeth' | 'hair';
  images: File[];
}

interface ConsultationFormProps {
  onSuccess: (data: { originalUrl: string; transformedUrl: string }[]) => void;
}

export default function ConsultationForm({ onSuccess }: ConsultationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    treatmentType: 'teeth',
    images: [],
  });
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consentAccepted) {
      setError('Please accept the consent to proceed');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (formData.images.length === 0) {
        throw new Error('Please upload at least one image');
      }

      const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured. Please check your .env.local file.');
      }

      // Create prompt based on treatment type
      const prompt = formData.treatmentType === 'teeth'
        ? "Transform this image to show perfect, white, aligned teeth. Make the teeth look naturally beautiful and professionally whitened. Keep the person's face and features exactly the same, only improve the teeth to look like they've had professional dental work. Maintain realistic lighting and natural appearance."
        : "Transform this image to show fuller, healthier, more voluminous hair. Make the hair look professionally styled and treated. Keep the person's face and features exactly the same, only improve the hair to look thicker, healthier, and more vibrant. Maintain realistic lighting and natural appearance.";

      const results: { originalUrl: string; transformedUrl: string }[] = [];

      // Process each image
      for (let i = 0; i < formData.images.length; i++) {
        const image = formData.images[i];
        
        // Upload to Supabase Storage
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `consultations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('consultation-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('consultation-images')
          .getPublicUrl(filePath);

        // Convert image to base64 for Gemini API
        const imageBuffer = await image.arrayBuffer();
        const imageBytes = new Uint8Array(imageBuffer);
        const base64Image = btoa(String.fromCharCode(...imageBytes));
        
        // Determine MIME type
        const mimeType = image.type || 'image/jpeg';

        // Call Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`;
        
        const geminiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!geminiResponse.ok) {
          const errorData = await geminiResponse.text();
          console.error('Gemini API error:', errorData);
          throw new Error(`Failed to process image ${i + 1} with Gemini API`);
        }

        const geminiData = await geminiResponse.json();
        
        if (geminiData.error) {
          throw new Error(`Gemini API error: ${geminiData.error.message || JSON.stringify(geminiData.error)}`);
        }
        
        const candidate = geminiData.candidates?.[0];
        if (!candidate) {
          throw new Error(`No response from Gemini API for image ${i + 1}`);
        }

        const parts = candidate.content?.parts || [];
        let transformedImageData: string | null = null;

        // Look for inlineData (camelCase) or inline_data (snake_case)
        for (const part of parts) {
          if (part.inlineData?.data) {
            transformedImageData = part.inlineData.data;
            break;
          }
          if (part.inline_data?.data) {
            transformedImageData = part.inline_data.data;
            break;
          }
        }

        if (!transformedImageData) {
          throw new Error(`No transformed image received from Gemini API for image ${i + 1}`);
        }

        // Convert base64 to data URL
        const transformedUrl = `data:image/png;base64,${transformedImageData}`;
        results.push({ originalUrl: publicUrl, transformedUrl });

        // Save to database
        const { error: dbError } = await supabase
          .from('consultations')
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            treatment_type: formData.treatmentType,
            original_image_url: publicUrl,
            transformed_image_url: transformedUrl,
          });

        if (dbError) throw dbError;
      }

      onSuccess(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-white mb-2">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-transparent transition-all"
            placeholder="Enter your first name"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-white mb-2">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-transparent transition-all"
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-transparent transition-all"
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-transparent transition-all"
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Treatment Type
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, treatmentType: 'teeth' })}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              formData.treatmentType === 'teeth'
                ? 'bg-[#006069] text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Teeth
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, treatmentType: 'hair' })}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              formData.treatmentType === 'hair'
                ? 'bg-[#006069] text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Hair
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Upload Photos {formData.images.length > 0 && `(${formData.images.length} selected)`}
        </label>
        <div className="relative">
          <input
            type="file"
            id="image"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <label
            htmlFor="image"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/30 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all"
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
                <Upload className="w-12 h-12 text-white/50 mb-4" />
                <p className="mb-2 text-sm text-white/70">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-white/50">PNG, JPG or JPEG (MAX. 5MB per image)</p>
                <p className="text-xs text-white/40 mt-1">You can select multiple images</p>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
        <input
          type="checkbox"
          id="consent"
          checked={consentAccepted}
          onChange={(e) => setConsentAccepted(e.target.checked)}
          className="mt-1 w-5 h-5 text-[#006069] bg-white/10 border-white/20 rounded focus:ring-[#006069] focus:ring-2"
        />
        <label htmlFor="consent" className="text-sm text-white/90 cursor-pointer">
          I consent to the processing of my personal information and photos for consultation purposes. 
          I understand that my data will be stored securely and used only for providing consultation services.
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
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
  );
}

