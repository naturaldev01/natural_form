'use client';

import { useEffect, useState, type SVGProps } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Upload, Loader2, Mail, X, CheckCircle, MessageCircle, Headphones, Info, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { useI18n } from '@/lib/i18n';
import { SUPPORTED_LANGUAGES, type TranslationKey } from '@/lib/i18n/translations';

const WHATSAPP_NUMBER = '902129190555';
const WHATSAPP_MESSAGE =
  "Hi, I'm interested in treatments in Natural Clinic, and I would like to learn more.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

const WhatsAppIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16 3c-7.18 0-13 5.69-13 12.68 0 2.23.6 4.33 1.76 6.18L3 29l7.35-1.92A13.5 13.5 0 0 0 16 28c7.18 0 13-5.69 13-12.68C29 8.69 23.18 3 16 3zm0 22.95a10.8 10.8 0 0 1-4.9-1.16l-.36-.19-4.27 1.12 1.14-4.05-.22-.34A10 10 0 0 1 5.74 15.7c0-5.56 4.6-10.08 10.26-10.08 5.66 0 10.26 4.52 10.26 10.08 0 5.56-4.6 10.25-10.26 10.25zm6.02-7.64c-.33-.17-1.94-.94-2.23-1.05-.3-.11-.52-.17-.74.16-.22.33-.85 1.05-1.03 1.27-.19.22-.37.25-.7.08-.33-.16-1.36-.51-2.58-1.63-.95-.85-1.59-1.88-1.78-2.2-.19-.33-.02-.51.14-.68.14-.14.33-.37.48-.54.16-.19.22-.33.33-.54.11-.22.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.39-.27-.65-.54-.55-.73-.56l-.62-.01c-.22 0-.56.08-.85.4-.29.32-1.12 1.08-1.12 2.63 0 1.55 1.15 3.05 1.31 3.26.16.22 2.22 3.36 5.39 4.71a9.7 9.7 0 0 0 1.8.65c.74.24 1.42.2 1.96.13.6-.09 1.92-.78 2.18-1.53.27-.75.27-1.39.19-1.54-.08-.14-.3-.22-.63-.39z" />
  </svg>
);

interface FormData {
  treatmentType: 'teeth' | 'hair';
  teethShade: string;
  teethStyle: string;
  images: File[];
}

interface TransformationResult {
  originalUrl: string;
  transformedUrl: string;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
}

const COUNTRY_CODES = [
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+359', country: 'Bulgaria', flag: '🇧🇬' },
  { code: '+381', country: 'Serbia', flag: '🇷🇸' },
  { code: '+385', country: 'Croatia', flag: '🇭🇷' },
  { code: '+386', country: 'Slovenia', flag: '🇸🇮' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
];

interface ConsultationResultPayload {
  results: TransformationResult[];
  preferences?: {
    teethShade?: string;
    teethStyle?: string;
  };
}

interface ConsultationFormProps {
  onSuccess?: (data: ConsultationResultPayload) => void;
  initialTreatmentType?: 'teeth' | 'hair';
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

const TEETH_STYLE_DESCRIPTIONS: Record<string, string> = {
  AggressiveStyle: 'Sharp, angular tooth edges for a bold look.',
  DominantStyle: 'Pronounced canines and a confident smile line.',
  EnhancedStyle: 'Slightly longer fronts for a glamorous finish.',
  FocusedStyle: 'Straight, uniform row that centers the smile.',
  FunctionalStyle: 'Balanced bite aesthetics with gentle curves.',
  HollywoodStyle: 'High-contrast, bright, and perfectly aligned.',
  MatureStyle: 'Refined proportions inspired by natural aging.',
  NaturalStyle: 'Soft variation in lengths for the most organic feel.',
  OvalStyle: 'Rounded corners that flatter broader lip shapes.',
  SoftenedStyle: 'Minimal angles with a velvety outline.',
  VigorousStyle: 'Energetic contours with subtly tipped edges.',
  YouthfulStyle: 'Small scallops that mimic freshly erupted teeth.',
};

const TEETH_STYLE_OPTIONS = TEETH_STYLES.map((style, index) => ({
  ...style,
  number: index + 1,
  description: TEETH_STYLE_DESCRIPTIONS[style.value] || 'Inspired by the smile gallery reference.',
}));

type ShadeSegment = { start: number; end: number };
const TEETH_SHADE_SEGMENTS: Record<'desktop' | 'mobile', ShadeSegment[]> = {
  desktop: [
    { start: 0.010769, end: 0.053846 },
    { start: 0.063077, end: 0.106923 },
    { start: 0.112308, end: 0.156923 },
    { start: 0.167692, end: 0.21 },
    { start: 0.217692, end: 0.261538 },
    { start: 0.271538, end: 0.314615 },
    { start: 0.323077, end: 0.366154 },
    { start: 0.373077, end: 0.416923 },
    { start: 0.427692, end: 0.47 },
    { start: 0.476154, end: 0.52 },
    { start: 0.53, end: 0.573077 },
    { start: 0.582308, end: 0.626154 },
    { start: 0.634615, end: 0.675385 },
    { start: 0.686923, end: 0.73 },
    { start: 0.739231, end: 0.781538 },
    { start: 0.789231, end: 0.832308 },
    { start: 0.843077, end: 0.883077 },
    { start: 0.892308, end: 0.936154 },
    { start: 0.941538, end: 0.984615 },
  ],
  mobile: [
    { start: 0.015385, end: 0.058462 },
    { start: 0.068462, end: 0.110769 },
    { start: 0.118462, end: 0.16 },
    { start: 0.172308, end: 0.214615 },
    { start: 0.223846, end: 0.265385 },
    { start: 0.276923, end: 0.318462 },
    { start: 0.328462, end: 0.37 },
    { start: 0.378462, end: 0.419231 },
    { start: 0.431538, end: 0.473077 },
    { start: 0.481538, end: 0.523846 },
    { start: 0.534615, end: 0.576154 },
    { start: 0.587692, end: 0.628462 },
    { start: 0.638462, end: 0.678462 },
    { start: 0.692308, end: 0.733077 },
    { start: 0.743846, end: 0.785385 },
    { start: 0.793846, end: 0.836154 },
    { start: 0.847692, end: 0.886154 },
    { start: 0.897692, end: 0.938462 },
    { start: 0.946154, end: 0.987692 },
  ],
};

const TEETH_SHADE_GUIDE_PLACEHOLDERS = {
  mobile: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDUwNTA1Ii8+PC9zdmc+',
  desktop: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDUwNTA1Ii8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjMiIGZpbGw9IiMwZjBmMGYiLz48L3N2Zz4=',
};

const LOGO_URL = '/assets/logo.png';
const imageDataCache = new Map<string, string>();

export default function ConsultationForm({ onSuccess, initialTreatmentType = 'teeth' }: ConsultationFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useI18n();
  const [formData, setFormData] = useState<FormData>({
    treatmentType: initialTreatmentType,
    teethShade: '',
    teethStyle: '',
    images: [],
  });
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [showShadeGuide, setShowShadeGuide] = useState(false);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [validatingPhoto, setValidatingPhoto] = useState(false);
  const [validationError, setValidationError] = useState<{
    show: boolean;
    issues: string[];
    reason: string;
  } | null>(null);

  // Transformation results state
  const [transformationResults, setTransformationResults] = useState<TransformationResult[] | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '',
    phone: '',
  });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [submittingWhatsApp, setSubmittingWhatsApp] = useState(false);
  const [phoneValidating, setPhoneValidating] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneValidated, setPhoneValidated] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailValidated, setEmailValidated] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showResultPage, setShowResultPage] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);
  const selectedShade = TEETH_SHADES.find((shade) => shade.value === formData.teethShade);
  const selectedStyle = TEETH_STYLE_OPTIONS.find((style) => style.value === formData.teethStyle);
  const navigateForTreatment = (type: 'teeth' | 'hair') => {
    const segments = pathname?.split('/').filter(Boolean) ?? [];
    const potentialLocale = segments[0];
    const hasLocale = potentialLocale
      ? SUPPORTED_LANGUAGES.some((lang) => lang.code === potentialLocale)
      : false;
    const prefix = hasLocale ? `/${potentialLocale}` : '';
    const targetPath = type === 'teeth' ? `${prefix}/teeth` : `${prefix}/hair`;
    const normalizedTarget = targetPath.replace(/\/\/+/g, '/');
    if (pathname !== normalizedTarget) {
      router.push(normalizedTarget);
    }
  };
  const handleTreatmentSelect = (type: 'teeth' | 'hair') => {
    setFormData((prev) => ({
      ...prev,
      treatmentType: type,
      ...(type === 'hair' ? { teethShade: '', teethStyle: '' } : {}),
    }));
    navigateForTreatment(type);
  };

  useEffect(() => {
    const handleViewportChange = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    return () => window.removeEventListener('resize', handleViewportChange);
  }, []);

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
      setError(
        t('errors.imageTooLarge', {
          files: invalidFiles.join(', '),
        })
      );
    }

    if (validFiles.length > 0) {
      const newImages = [...formData.images, ...validFiles];
      setFormData({ ...formData, images: newImages });

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
    // Clear validation error when removing images
    setValidationError(null);
  };

  const validatePhoto = async (imageDataUrl: string, mimeType: string): Promise<{
    isValid: boolean;
    issues: string[];
    reason: string;
  }> => {
    try {
      const response = await fetch('/api/validate-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          mimeType,
        }),
      });

      if (!response.ok) {
        // If validation fails, allow the photo (fail open)
        console.warn('[validatePhoto] API error, allowing photo');
        return { isValid: true, issues: [], reason: '' };
      }

      const data = await response.json();
      return {
        isValid: data.isValid,
        issues: data.issues || [],
        reason: data.reason || '',
      };
    } catch (error) {
      // If validation fails, allow the photo (fail open)
      console.warn('[validatePhoto] Error:', error);
      return { isValid: true, issues: [], reason: '' };
    }
  };

  const submitForm = async () => {
    if (!consentAccepted) {
      setError(t('errors.missingConsent'));
      return;
    }

    if (formData.images.length === 0) {
      setError(t('errors.missingImages'));
      return;
    }

    if (
      formData.treatmentType === 'teeth' &&
      (!formData.teethShade || !formData.teethStyle)
    ) {
      setError(t('errors.teethPreferences'));
      return;
    }

    setLoading(true);
    setError(null);
    setValidationError(null);

    // Validate photos before processing (only for teeth treatment)
    if (formData.treatmentType === 'teeth') {
      setValidatingPhoto(true);
      
      for (let i = 0; i < previews.length; i++) {
        const preview = previews[i];
        const mimeType = formData.images[i]?.type || 'image/jpeg';
        
        const validationResult = await validatePhoto(preview, mimeType);
        
        if (!validationResult.isValid) {
          setValidatingPhoto(false);
          setLoading(false);
          setValidationError({
            show: true,
            issues: validationResult.issues,
            reason: validationResult.reason,
          });
          return;
        }
      }
      
      setValidatingPhoto(false);
    }

    try {
      const results: TransformationResult[] = [];

      for (let i = 0; i < formData.images.length; i++) {
        const image = formData.images[i];
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `consultations/${fileName}`;

        const supabase = createClient();
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
            transformData?.error ||
            transformData?.message ||
            `Failed to transform image ${i + 1}`;
          throw new Error(errorMessage);
        }

        const transformedUrl = transformData.transformedUrl;
        results.push({ originalUrl: publicUrl, transformedUrl });
      }

      // Sonuçları kaydet ve pop-up'ı göster
      setTransformationResults(results);
      setShowContactModal(true);
      setFormData((prev) => ({ ...prev, images: [] }));
      setPreviews([]);

    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  const rerunWithSameSelections = async () => {
    if (!transformationResults || !transformationResults.length) return;
    setRerunLoading(true);
    setError(null);

    try {
      const results: TransformationResult[] = [];
      for (const result of transformationResults) {
        const transformResponse = await fetch('/api/transform-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: result.originalUrl,
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
            transformData?.error ||
            transformData?.message ||
            t('errors.generic');
          throw new Error(errorMessage);
        }

        results.push({
          originalUrl: result.originalUrl,
          transformedUrl: transformData.transformedUrl,
        });
      }

      setTransformationResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setRerunLoading(false);
    }
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[0-9\s]{6,15}$/;

  // Telefon numarası değiştiğinde validated state'i sıfırla
  const handlePhoneChange = (newPhone: string) => {
    setContactInfo({ ...contactInfo, phone: newPhone });
    setPhoneValidated(false);
    setPhoneError(null);
  };

  // Country code değiştiğinde validated state'i sıfırla
  const handleCountryCodeChange = (newCode: string) => {
    setContactInfo({ ...contactInfo, countryCode: newCode });
    setPhoneValidated(false);
    setPhoneError(null);
  };

  // Email değiştiğinde validated state'i sıfırla
  const handleEmailChange = (newEmail: string) => {
    setContactInfo({ ...contactInfo, email: newEmail });
    setEmailValidated(false);
    setEmailError(null);
  };

  // Telnyx ile telefon numarasını doğrula
  const validatePhoneNumber = async (): Promise<boolean> => {
    // Ülke kodu seçilmemiş mi kontrol et
    if (!contactInfo.countryCode) {
      setPhoneError(t('contactModal.selectCountryFirst') || 'Please select a country code first');
      return false;
    }

    const phone = contactInfo.phone.trim().replace(/\s/g, '');
    
    if (!PHONE_REGEX.test(phone)) {
      setPhoneError(t('contactModal.invalidPhone') || 'Invalid phone number format');
      return false;
    }

    setPhoneValidating(true);
    setPhoneError(null);

    try {
      const response = await fetch('/api/validate-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          countryCode: contactInfo.countryCode,
        }),
      });

      const data = await response.json();

      // Numara geçersizse veya doğrulama atlandıysa reddet
      if (!data.valid || data.skipped) {
        const errorMessage = data.errorCode === 'NOT_FOUND' || data.errorCode === 'INVALID_FORMAT'
          ? (t('contactModal.invalidPhone') || 'This phone number is invalid. Please check and try again.')
          : data.skipped
            ? (t('contactModal.invalidPhone') || 'Phone validation failed. Please check your number.')
            : (data.error || t('contactModal.invalidPhone') || 'Invalid phone number');
        setPhoneError(errorMessage);
        setPhoneValidated(false);
        return false;
      }

      setPhoneValidated(true);
      setPhoneError(null);
      return true;
    } catch (error) {
      console.error('[validatePhone] Error:', error);
      // API hatası durumunda numarayı reddet
      setPhoneError(t('contactModal.invalidPhone') || 'Phone validation failed. Please try again.');
      setPhoneValidated(false);
      return false;
    } finally {
      setPhoneValidating(false);
    }
  };

  // Emailable ile email adresini doğrula
  const validateEmailAddress = async (): Promise<boolean> => {
    const email = contactInfo.email.trim();
    
    if (!EMAIL_REGEX.test(email)) {
      setEmailError(t('contactModal.invalidEmail') || 'Invalid email format');
      return false;
    }

    setEmailValidating(true);
    setEmailError(null);

    try {
      const response = await fetch('/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.valid && !data.skipped) {
        const errorMessage = t('contactModal.invalidEmail') || 'This email address is invalid or undeliverable. Please check and try again.';
        setEmailError(errorMessage);
        setEmailValidated(false);
        return false;
      }

      setEmailValidated(true);
      setEmailError(null);
      return true;
    } catch (error) {
      console.error('[validateEmail] Error:', error);
      // API hatası durumunda devam etmesine izin ver (graceful degradation)
      setEmailValidated(true);
      return true;
    } finally {
      setEmailValidating(false);
    }
  };

  const isContactComplete = () => {
    const email = contactInfo.email.trim();
    const phone = contactInfo.phone.trim().replace(/\s/g, '');
    
    return (
      contactInfo.firstName.trim().length >= 2 &&
      contactInfo.lastName.trim().length >= 2 &&
      EMAIL_REGEX.test(email) &&
      PHONE_REGEX.test(phone)
    );
  };

  const handleSendEmail = async () => {
    if (!isContactComplete() || !transformationResults) return;
    
    // Email doğrulaması yapılmamışsa önce doğrula
    if (!emailValidated) {
      const isEmailValid = await validateEmailAddress();
      if (!isEmailValid) return;
    }
    
    // Telefon doğrulaması yapılmamışsa önce doğrula
    if (!phoneValidated) {
      const isPhoneValid = await validatePhoneNumber();
      if (!isPhoneValid) return;
    }
    
    setSubmittingContact(true);

    try {
      const supabase = createClient();
      const fullPhoneNumber = `${contactInfo.countryCode}${contactInfo.phone.trim().replace(/\s/g, '')}`;
      const contactName = `${contactInfo.firstName} ${contactInfo.lastName}`.trim();
      
      // 1. PDF oluştur
      const pdfBlob = await generatePdf(
        transformationResults,
        contactName,
        formData.treatmentType,
        t
      );
      const pdfBase64 = await blobToBase64(pdfBlob);

      // 2. PDF'i Storage'a yükle (performanslı: tek upload)
      const sanitizedName = contactName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
        .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
        .replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
      
      const pdfFileName = `pdfs/${Date.now()}-${sanitizedName || 'user'}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('consultation-images')
        .upload(pdfFileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      let pdfUrl: string | undefined;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('consultation-images')
          .getPublicUrl(pdfFileName);
        pdfUrl = publicUrl;
      }

      // 3. Veritabanına kaydet (tek insert, pdf_url dahil)
      for (const result of transformationResults) {
        const { error: dbError } = await (supabase.from('consultations') as any).insert({
          first_name: contactInfo.firstName.trim(),
          last_name: contactInfo.lastName.trim(),
          email: contactInfo.email.trim(),
          phone: fullPhoneNumber,
          treatment_type: formData.teethShade ? 'teeth' : 'hair',
          original_image_url: result.originalUrl,
          transformed_image_url: result.transformedUrl,
          pdf_url: pdfUrl,
        });

        if (dbError) throw dbError;
      }

      // 4. Email gönder
      const filename = `natural-clinic-${Date.now()}.pdf`;
      const response = await fetch('/api/send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          filename,
          toEmail: contactInfo.email,
          contactName,
          language,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ||
            t('notifications.sendFailed', { message: t('contactModal.emailLabel') })
        );
      }

      onSuccess?.({
        results: transformationResults,
        preferences:
          formData.treatmentType === 'teeth'
            ? { teethShade: formData.teethShade, teethStyle: formData.teethStyle }
            : undefined,
      });

      setShowContactModal(false);
      setSuccessMessage(t('success.message'));
      setShowSuccessModal(true);
    } catch (error) {
      const details =
        error instanceof Error ? error.message : t('contactModal.emailLabel');
      alert(`${t('notifications.sendFailed', { message: details })} ${t('notifications.tryAgain')}`);
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!isContactComplete() || !transformationResults) return;
    
    // Email doğrulaması yapılmamışsa önce doğrula
    if (!emailValidated) {
      const isEmailValid = await validateEmailAddress();
      if (!isEmailValid) return;
    }
    
    // Telefon doğrulaması yapılmamışsa önce doğrula
    if (!phoneValidated) {
      const isPhoneValid = await validatePhoneNumber();
      if (!isPhoneValid) return;
    }
    
    setSubmittingWhatsApp(true);

    try {
      const supabase = createClient();
      // WhatsApp API için + işareti olmadan telefon numarası
      const countryCodeClean = contactInfo.countryCode.replace('+', '');
      const fullPhoneNumber = `${countryCodeClean}${contactInfo.phone.trim().replace(/\s/g, '')}`;
      const contactName = `${contactInfo.firstName} ${contactInfo.lastName}`.trim();
      
      // 1. PDF oluştur
      const pdfBlob = await generatePdf(transformationResults, contactName, formData.treatmentType, t);

      // 2. PDF'i Storage'a yükle
      const sanitizedName = contactName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
        .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
        .replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
      
      const pdfFileName = `whatsapp-pdfs/${Date.now()}-${sanitizedName || 'user'}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('consultation-images')
        .upload(pdfFileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // PDF URL'ini al
      const { data: { publicUrl: pdfUrl } } = supabase.storage
        .from('consultation-images')
        .getPublicUrl(pdfFileName);

      // 3. Veritabanına kaydet (tek insert, pdf_url dahil)
      for (const result of transformationResults) {
        const { error: dbError } = await (supabase.from('consultations') as any).insert({
          first_name: contactInfo.firstName.trim(),
          last_name: contactInfo.lastName.trim(),
          email: contactInfo.email.trim(),
          phone: fullPhoneNumber,
          treatment_type: formData.teethShade ? 'teeth' : 'hair',
          original_image_url: result.originalUrl,
          transformed_image_url: result.transformedUrl,
          pdf_url: pdfUrl,
        });

        if (dbError) {
          throw dbError;
        }
      }

      // 4. WhatsApp Cloud API ile template mesajı gönder
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          pdfUrl: pdfUrl,
          firstName: contactInfo.firstName.trim(),
          lastName: contactInfo.lastName.trim(),
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            t('notifications.sendFailed', { message: t('contactModal.whatsappLabel') })
        );
      }

      // onSuccess'i çağır
      onSuccess?.({
        results: transformationResults,
        preferences:
          formData.treatmentType === 'teeth'
            ? {
                teethShade: formData.teethShade,
                teethStyle: formData.teethStyle,
              }
            : undefined,
      });

      setShowContactModal(false);
      setSuccessMessage(t('success.message'));
      setShowSuccessModal(true);
    } catch (error) {
      const details =
        error instanceof Error ? error.message : t('contactModal.whatsappLabel');
      alert(`${t('notifications.sendFailed', { message: details })} ${t('notifications.tryAgain')}`);
    } finally {
      setSubmittingWhatsApp(false);
    }
  };

  const handleSendBoth = async () => {
    if (!isContactComplete() || !transformationResults) return;
    
    // Email doğrulaması yapılmamışsa önce doğrula
    if (!emailValidated) {
      const isEmailValid = await validateEmailAddress();
      if (!isEmailValid) return;
    }
    
    // Telefon doğrulaması yapılmamışsa önce doğrula
    if (!phoneValidated) {
      const isPhoneValid = await validatePhoneNumber();
      if (!isPhoneValid) return;
    }
    
    setSubmittingContact(true);
    setSubmittingWhatsApp(true);

    try {
      const supabase = createClient();
      // WhatsApp API için + işareti olmadan telefon numarası
      const countryCodeClean = contactInfo.countryCode.replace('+', '');
      const fullPhoneNumber = `${countryCodeClean}${contactInfo.phone.trim().replace(/\s/g, '')}`;
      const contactName = `${contactInfo.firstName} ${contactInfo.lastName}`.trim();
      
      // 1. PDF oluştur
      const pdfBlob = await generatePdf(transformationResults, contactName, formData.treatmentType, t);
      const pdfBase64 = await blobToBase64(pdfBlob);

      // 2. PDF'i Storage'a yükle
      const sanitizedName = contactName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
        .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
        .replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
      
      const pdfFileName = `whatsapp-pdfs/${Date.now()}-${sanitizedName || 'user'}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('consultation-images')
        .upload(pdfFileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // PDF URL'ini al
      const { data: { publicUrl: pdfUrl } } = supabase.storage
        .from('consultation-images')
        .getPublicUrl(pdfFileName);

      // 3. Veritabanına kaydet (tek insert, pdf_url dahil)
      for (const result of transformationResults) {
        const { error: dbError } = await (supabase.from('consultations') as any).insert({
          first_name: contactInfo.firstName.trim(),
          last_name: contactInfo.lastName.trim(),
          email: contactInfo.email.trim(),
          phone: fullPhoneNumber,
          treatment_type: formData.teethShade ? 'teeth' : 'hair',
          original_image_url: result.originalUrl,
          transformed_image_url: result.transformedUrl,
          pdf_url: pdfUrl,
        });

        if (dbError) {
          throw dbError;
        }
      }

      const filename = `natural-clinic-${Date.now()}.pdf`;

      // 4. Email gönder (paralel)
      const emailPromise = fetch('/api/send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          filename,
          toEmail: contactInfo.email,
          contactName,
        }),
      });

      // 5. WhatsApp Cloud API ile template mesajı gönder (paralel)
      const whatsappPromise = fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          pdfUrl: pdfUrl,
          firstName: contactInfo.firstName.trim(),
          lastName: contactInfo.lastName.trim(),
          language,
        }),
      });

      // Her iki işlemi paralel olarak bekle
      const [emailResponse, whatsappResponse] = await Promise.all([emailPromise, whatsappPromise]);

      // Hataları kontrol et
      const errors: string[] = [];
      
      if (!emailResponse.ok) {
        const emailData = await emailResponse.json().catch(() => ({}));
        errors.push(
          t('notifications.channelFailed', {
            channel: t('contactModal.emailLabel'),
            message: emailData.error || t('notifications.tryAgain'),
          })
        );
      }

      if (!whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json().catch(() => ({}));
        errors.push(
          t('notifications.channelFailed', {
            channel: t('contactModal.whatsappLabel'),
            message: whatsappData.error || t('notifications.tryAgain'),
          })
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // onSuccess'i çağır
      onSuccess?.({
        results: transformationResults,
        preferences:
          formData.treatmentType === 'teeth'
            ? {
                teethShade: formData.teethShade,
                teethStyle: formData.teethStyle,
              }
            : undefined,
      });

      setShowContactModal(false);
      setSuccessMessage(t('success.message'));
      setShowSuccessModal(true);
    } catch (error) {
      const details =
        error instanceof Error ? error.message : t('notifications.tryAgain');
      alert(`${t('notifications.sendFailed', { message: details })} ${t('notifications.tryAgain')}`);
    } finally {
      setSubmittingContact(false);
      setSubmittingWhatsApp(false);
    }
  };

  const handleCloseAndShowResult = () => {
    setShowSuccessModal(false);
    setShowResultPage(true);
  };

  const handleBackToForm = () => {
    setShowResultPage(false);
    // Formu sıfırla
    setFormData({
      treatmentType: initialTreatmentType,
      teethShade: '',
      teethStyle: '',
      images: [],
    });
    setPreviews([]);
    setTransformationResults(null);
    setContactInfo({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '',
      phone: '',
    });
  };

  const renderShadeGuideVariant = (variant: 'mobile' | 'desktop') => {
    const isMobileVariant = variant === 'mobile';
    const imageSrc = isMobileVariant ? '/assets/teeth_mobile_v1.jpg' : '/assets/teeth_web_v1.jpg';
    const aspectRatio = isMobileVariant ? '7485 / 12985' : '12970 / 7442';
    const segments = TEETH_SHADE_SEGMENTS[isMobileVariant ? 'mobile' : 'desktop'];

    return (
      <div
        className="relative w-full max-h-[70vh]"
        style={{ aspectRatio }}
      >
        <Image
          src={imageSrc}
          alt={t('shade.title')}
          fill
          className="object-contain select-none"
          sizes={isMobileVariant ? '100vw' : '(max-width: 1200px) 90vw, 1200px'}
          placeholder="blur"
          blurDataURL={isMobileVariant ? TEETH_SHADE_GUIDE_PLACEHOLDERS.mobile : TEETH_SHADE_GUIDE_PLACEHOLDERS.desktop}
          quality={60}
          priority
        />
        <div className="absolute inset-0">
          {segments.map((segment, index) => {
            const shade = TEETH_SHADES[index];
            const isSelected = formData.teethShade === shade.value;
            const spanSize = (segment.end - segment.start) * 100;
            const sharedClasses = 'absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7c83] transition';
            const style = isMobileVariant
              ? {
                  top: `${segment.start * 100}%`,
                  height: `${spanSize}%`,
                  left: 0,
                  right: 0,
                }
              : {
                  left: `${segment.start * 100}%`,
                  width: `${spanSize}%`,
                  top: 0,
                  bottom: 0,
                };

            return (
              <button
                key={shade.value}
                type="button"
                aria-label={t('aria.selectShade', { value: shade.label })}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, teethShade: shade.value }));
                  setShowShadeGuide(false);
                }}
                style={style}
                className={`${sharedClasses} ${
                  isSelected ? 'bg-white/5' : 'bg-transparent hover:bg-white/5'
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-1 border-2 border-[#00a1a9] rounded-md pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
        {!isMobileVariant && selectedShade && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur">
            {selectedShade.value}
            {selectedShade.label.includes('–') && (
              <span className="text-[11px] font-normal text-gray-200">
                {' '}
                {selectedShade.label.split('–')[1]?.trim()}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        
        {/* Treatment type buttons - only teeth visible for now */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleTreatmentSelect('teeth')}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all shadow-sm bg-[#006069] text-white shadow-lg"
            >
              {t('form.treatment.teeth')}
            </button>
            {/* Hair button hidden for now
            <button
              type="button"
              onClick={() => handleTreatmentSelect('hair')}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all shadow-sm ${
                formData.treatmentType === 'hair'
                  ? 'bg-[#006069] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('form.treatment.hair')}
            </button>
            */}
          </div>
        </div>

        {formData.treatmentType === 'teeth' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700"></p>
                  <p className="text-xs text-gray-500"></p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShadeGuide(true)}
                  className="w-full text-left px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#0f7c83] hover:bg-[#0f7c83]/5 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full border border-gray-200 flex items-center justify-center bg-gradient-to-br from-white to-gray-100">
                      <span className="text-lg">🎨</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedShade ? selectedShade.value : t('form.color.placeholderTitle')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedShade
                          ? selectedShade.label.split('–')[1]?.trim() ?? selectedShade.label
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#006069]">{t('form.color.edit')}</span>
                </button>
                <p className="text-xs text-gray-500">
                  {formData.teethShade
                    ? t('form.color.selectedTone', {
                        value: selectedShade?.label ?? formData.teethShade,
                      })
                    : ''}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700"></p>
                  <p className="text-xs text-gray-500"></p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStyleGuide(true)}
                  className="w-full text-left px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#0f7c83] hover:bg-[#0f7c83]/5 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full border border-gray-200 flex items-center justify-center bg-[#006069]/10 text-[#006069] text-lg font-semibold">
                      {selectedStyle ? selectedStyle.number : '🙂'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedStyle ? selectedStyle.label : t('form.style.placeholderTitle')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedStyle
                          ? selectedStyle.description
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#006069]">{t('form.color.edit')}</span>
                </button>
                <p className="text-xs text-gray-500">
                  {formData.teethStyle
                    ? t('form.style.selectedStyle', {
                        value: selectedStyle?.label ?? formData.teethStyle,
                      })
                    : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('form.upload.label')}{' '}
              {formData.images.length > 0 &&
                `(${t('form.upload.selectedCount', {
                  count: formData.images.length.toString(),
                })})`}
            </label>
            <button
              type="button"
              onClick={() => setShowPhotoGuide(true)}
              className="flex items-center gap-1.5 text-sm text-[#006069] hover:text-[#004750] font-medium transition-colors"
            >
              <Info className="w-4 h-4" />
              {t('photoGuide.link')}
            </button>
          </div>
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
              className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer bg-gradient-to-br from-gray-50 to-white hover:from-white hover:to-gray-50 transition-all shadow-inner py-4 sm:h-56"
            >
              {previews.length > 0 ? (
                <div className="w-full h-full p-4 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={t('form.upload.previewAlt', { index: String(index + 1) })}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center text-center px-4 space-y-1 sm:space-y-2">
                  <Upload className="w-5 h-5 text-[#006069] mb-1 sm:mb-2" />
                  <p className="text-xs text-gray-600 sm:text-sm">
                    <span className="font-semibold">{t('form.upload.cta')}</span>{' '}
                    {t('form.upload.dragHint')}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {t('form.upload.fileInfo')}
                  </p>
                  <p className="text-[9px] sm:text-xs text-gray-400">
                    {t('form.upload.multiInfo')}
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || validatingPhoto || !consentAccepted || formData.images.length === 0}
          className="w-full py-3 px-5 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {validatingPhoto ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('validation.checking')}
            </>
          ) : loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('form.submit.loading')}
            </>
          ) : (
            t('form.submit.label')
          )}
        </button>

        <div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm text-[10px] sm:text-sm">
          <input
            type="checkbox"
            id="consent"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            required
            className="mt-1 w-5 h-5 text-[#006069] bg-white border-gray-300 rounded focus:ring-[#006069] focus:ring-2"
          />
          <label htmlFor="consent" className="text-xs text-gray-700 cursor-pointer">
            {t('form.consent.text')}
          </label>
        </div>
      </form>

      {/* Contact Modal with Blurred Background Image */}
      {showContactModal && transformationResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          {/* Container for both blurred image and modal */}
          <div className="relative max-w-4xl w-full">
            {/* Blurred Transformed Image Behind Modal - Same size as form container */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl border border-gray-100 w-full overflow-hidden">
                <img
                  src={transformationResults[0].transformedUrl}
                  alt={t('results.header.title')}
                  className="w-full h-auto object-contain blur-xl opacity-70 scale-105"
                />
              </div>
            </div>

            {/* Contact Form Modal - Centered on top */}
            <div className="relative z-10 flex items-center justify-center py-8">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 sm:space-y-6 animate-in zoom-in duration-300 border border-gray-100">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#006069] to-[#004750] rounded-full mb-4">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {formData.treatmentType === 'teeth' 
                      ? t('contactModal.title.teeth') 
                      : t('contactModal.title.hair')}
                  </h3>
                  <p className="text-gray-600">
                    {formData.treatmentType === 'teeth'
                      ? t('contactModal.subtitle.teeth')
                      : t('contactModal.subtitle.hair')}
                  </p>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="modal-firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('contactModal.field.firstName')}
                      </label>
                      <input
                        id="modal-firstName"
                        type="text"
                        value={contactInfo.firstName}
                        onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all"
                        placeholder="John"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('contactModal.field.lastName')}
                      </label>
                      <input
                        id="modal-lastName"
                        type="text"
                        value={contactInfo.lastName}
                        onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('contactModal.field.email')}
                    </label>
                    <div className="relative">
                      <input
                        id="modal-email"
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all ${
                          emailError ? 'border-red-400 bg-red-50' : emailValidated ? 'border-green-400 bg-green-50' : 'border-gray-200'
                        }`}
                        placeholder="your.email@example.com"
                      />
                      {emailValidating && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#006069]" />
                        </div>
                      )}
                      {emailValidated && !emailValidating && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    {emailError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="modal-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('contactModal.field.phone')}
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="modal-countryCode"
                        value={contactInfo.countryCode}
                        onChange={(e) => handleCountryCodeChange(e.target.value)}
                        aria-label={t('contactModal.field.countryCode')}
                        className={`w-32 px-3 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all text-sm ${
                          contactInfo.countryCode ? 'text-gray-900 border-gray-200' : 'text-gray-400 border-gray-200'
                        }`}
                      >
                        <option value="" disabled>
                          {t('contactModal.selectCountry') || '🌍 Select'}
                        </option>
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.code}
                          </option>
                        ))}
                      </select>
                      <div className="flex-1 relative">
                        <input
                          id="modal-phone"
                          type="tel"
                          value={contactInfo.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all ${
                            phoneError ? 'border-red-400 bg-red-50' : phoneValidated ? 'border-green-400 bg-green-50' : 'border-gray-200'
                          }`}
                          placeholder={t('contactModal.field.phonePlaceholder')}
                        />
                        {phoneValidating && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#006069]" />
                          </div>
                        )}
                        {phoneValidated && !phoneValidating && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    {phoneError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" />
                        {phoneError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4 text-[#006069]" />
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span>
                      {t('contactModal.deliveryInfo', {
                        email: t('contactModal.emailLabel'),
                        whatsapp: t('contactModal.whatsappLabel'),
                      })}
                    </span>
                  </p>
                <button
                    onClick={handleSendBoth}
                  disabled={!isContactComplete() || submittingContact || submittingWhatsApp || phoneValidating || emailValidating}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#006069] to-[#004750] hover:from-[#004750] hover:to-[#003840] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                    {emailValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('contactModal.validatingEmail') || 'Validating email...'}
                    </>
                  ) : phoneValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('contactModal.validatingPhone') || 'Validating phone...'}
                    </>
                  ) : (submittingContact || submittingWhatsApp) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('contactModal.sendLoading')}
                    </>
                  ) : (
                    <>
                        {t('contactModal.sendLabel')}
                    </>
                  )}
                </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  {t('contactModal.notice')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 sm:space-y-6 animate-in zoom-in duration-300">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900">
                {t('success.title')}
              </h3>
              
              <p className="text-gray-600 text-lg">
                {successMessage}
              </p>
            </div>

            <button
              onClick={handleCloseAndShowResult}
              className="w-full py-3 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all"
            >
              {t('success.cta')}
            </button>
          </div>
        </div>
      )}

      {/* Result Page - Before/After Comparison */}
      {showResultPage && transformationResults && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#006069] to-[#004750] text-white py-6 px-4">
              <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp" 
                    alt="Natural Clinic" 
                    className="h-12 brightness-0 invert"
                  />
                  <div>
                    <h1 className="text-2xl font-bold">{t('results.header.title')}</h1>
                    <p className="text-white/80 text-sm">{t('results.header.subtitle')}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleBackToForm}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                  >
                    <span>{t('results.header.button')}</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 py-12 px-4">
              <div className="max-w-6xl mx-auto">
                {/* Patient Info */}
                <div className="text-center mb-10">
                  <p className="text-gray-500 text-sm uppercase tracking-wide mb-2">
                    {t('results.info.label')}
                  </p>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {contactInfo.firstName} {contactInfo.lastName}
                  </h2>
                  {formData.treatmentType === 'teeth' && (
                    <p className="text-gray-600 mt-2">
                      <span className="font-semibold text-[#006069]">
                        {t('results.info.color', { value: formData.teethShade })}
                      </span>
                      {' · '}
                      <span className="font-semibold text-[#006069]">
                        {t('results.info.style', {
                          value: formData.teethStyle.replace(/([A-Z])/g, ' $1').trim(),
                        })}
                      </span>
                    </p>
                  )}
                </div>

                {/* Before/After Sets */}
                <div className="space-y-12">
                  {transformationResults.map((result, index) => (
                    <div key={result.transformedUrl} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#006069]/10 flex items-center justify-center text-[#006069] font-bold">
                          {index + 1}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {t('results.gallery.imageLabel', { index: String(index + 1) })}
                        </h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-bold">1</span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {t('results.gallery.before')}
                            </h4>
                          </div>
                          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200">
                            <img
                              src={result.originalUrl}
                              alt={`${t('results.gallery.before')} ${index + 1}`}
                              className="w-full h-auto"
                            />
                          </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#006069] flex items-center justify-center">
                              <span className="text-white font-bold">2</span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {t('results.gallery.after')}
                            </h4>
                          </div>
                          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#006069]/20">
                            <img
                              src={result.transformedUrl}
                              alt={`${t('results.gallery.after')} ${index + 1}`}
                              className="w-full h-auto"
                            />
                            <div className="absolute top-4 right-4 bg-[#006069] text-white px-3 py-1 rounded-full text-sm font-semibold">
                              {t('results.gallery.badge')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Refinement quick action */}
                {formData.treatmentType === 'teeth' && (
                  <div className="mt-10 text-center space-y-3">
                    <p className="text-sm text-gray-600">{t('results.refine.helper')}</p>
                    <button
                      onClick={rerunWithSameSelections}
                      disabled={rerunLoading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#006069] font-semibold rounded-xl border border-[#006069] shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {rerunLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('results.refine.loading')}
                        </>
                      ) : (
                        <>{t('results.refine.cta')}</>
                      )}
                    </button>
                  </div>
                )}

                {/* CTA Section */}
                <div className="mt-12 text-center">
                  <div className="bg-gradient-to-r from-[#006069]/10 to-[#004750]/10 rounded-2xl p-8 max-w-2xl mx-auto">
                    <div className="flex flex-col items-center gap-2 mb-6">
                      <div className="flex items-center gap-2 text-gray-900 font-bold text-xl">
                        <Headphones className="w-5 h-5 text-[#006069]" aria-hidden="true" />
                        <span>{t('pdf.cta.title')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Headphones className="w-4 h-4 text-[#006069]" aria-hidden="true" />
                        <span>{t('pdf.cta.subtitle')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-[#25D366] hover:bg-[#1da856] text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <WhatsAppIcon className="w-5 h-5 text-white" />
                        <span>{t('results.cta.whatsappButton')}</span>
                      </a>
                      <a
                        href="https://natural.clinic/contact"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all shadow-lg"
                      >
                        {t('results.cta.primary')}
                      </a>
                      <button
                        onClick={handleBackToForm}
                        className="px-6 py-3 bg-white hover:bg-gray-50 text-[#006069] font-semibold rounded-xl transition-all border border-[#006069]"
                      >
                        {t('results.cta.secondary')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 py-4 px-4 text-center">
              <p className="text-gray-500 text-sm">
                {t('results.footer.copy', { year: String(new Date().getFullYear()) })}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {t('results.footer.note')}
              </p>
            </div>
          </div>
        </div>
      )}

      {showShadeGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#006069] uppercase tracking-wide">
                  {t('shade.reference')}
                </p>
                <h3 className="text-2xl font-bold text-gray-900">{t('shade.title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShadeGuide(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label={t('aria.closeShadeGuide')}
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {t('shade.description')}
            </p>
            <div className="rounded-xl border border-gray-200">
              {renderShadeGuideVariant(isMobileViewport ? 'mobile' : 'desktop')}
            </div>
            <p className="text-xs text-[#006069] font-semibold">
              {formData.teethShade
                ? t('shade.selectedTone', { value: formData.teethShade })
                : t('shade.selectedNone')}
            </p>
          </div>
        </div>
      )}

      {showStyleGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#006069] uppercase tracking-wide">
                  {t('shade.reference')}
                </p>
                <h3 className="text-2xl font-bold text-gray-900">{t('styleGuide.title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStyleGuide(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label={t('aria.closeStyleGuide')}
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {t('styleGuide.description')}
            </p>
            <div className="rounded-xl border border-gray-200">
              <div
                className="relative w-full max-h-[75vh]"
                style={{ aspectRatio: '803 / 975' }}
              >
                <Image
                  src="/assets/teeth_styles.jpeg"
                  alt={t('styleGuide.title')}
                  fill
                  className="object-contain select-none"
                  sizes="(max-width: 768px) 90vw, 800px"
                  priority
                />
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-6">
                  {TEETH_STYLE_OPTIONS.map((style) => {
                    const isSelected = formData.teethStyle === style.value;
                    return (
                      <button
                        key={style.value}
                        type="button"
                        aria-label={t('aria.selectStyle', { value: style.label })}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, teethStyle: style.value }));
                          setShowStyleGuide(false);
                        }}
                        className={`relative w-full h-full border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7c83] transition ${
                          isSelected ? 'bg-white/10 border-[#00a1a9]' : 'bg-transparent hover:bg-black/10'
                        }`}
                      >
                        <span
                          className={`absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${
                            isSelected ? 'bg-[#006069]' : 'bg-black/60'
                          }`}
                        >
                          {style.number}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#006069] font-semibold">
              {formData.teethStyle
                ? t('styleGuide.selectedStyle', {
                    value:
                      TEETH_STYLE_OPTIONS.find((s) => s.value === formData.teethStyle)?.label ||
                      formData.teethStyle,
                  })
                : t('styleGuide.selectedNone')}
            </p>
          </div>
        </div>
      )}

      {/* Validation Error Modal */}
      {validationError?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in zoom-in duration-300 border border-gray-100">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                <span className="text-3xl">😬</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('validation.failed.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('validation.failed.description')}
              </p>
            </div>

            {validationError.issues.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  {t('validation.failed.issues')}
                </p>
                <ul className="space-y-1">
                  {validationError.issues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <X className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setShowPhotoGuide(true);
                }}
                className="w-full py-3 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Info className="w-5 h-5" />
                {t('validation.failed.viewGuide')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setFormData(prev => ({ ...prev, images: [] }));
                  setPreviews([]);
                }}
                className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
              >
                {t('validation.failed.tryAgain')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Guide Modal */}
      {showPhotoGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#006069] uppercase tracking-wide">
                  {t('photoGuide.reference')}
                </p>
                <h3 className="text-2xl font-bold text-gray-900">{t('photoGuide.title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoGuide(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                aria-label={t('aria.closePhotoGuide')}
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {t('photoGuide.description')}
            </p>
            
            {/* Example Photos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Female Example */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👩</span>
                  <h4 className="text-base font-semibold text-gray-900">{t('photoGuide.femaleExample')}</h4>
                </div>
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-100">
                  <Image
                    src="/assets/model_women.jpeg"
                    alt={t('photoGuide.femaleExample')}
                    width={400}
                    height={500}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <Check className="w-3.5 h-3.5" />
                    {t('photoGuide.goodExample')}
                  </div>
                </div>
              </div>

              {/* Male Example */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👨</span>
                  <h4 className="text-base font-semibold text-gray-900">{t('photoGuide.maleExample')}</h4>
                </div>
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-100">
                  <Image
                    src="/assets/model_men.jpeg"
                    alt={t('photoGuide.maleExample')}
                    width={400}
                    height={500}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <Check className="w-3.5 h-3.5" />
                    {t('photoGuide.goodExample')}
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💡</span>
                <h4 className="text-sm font-semibold text-gray-900">{t('photoGuide.tipsTitle')}</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{t('photoGuide.tip1')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{t('photoGuide.tip2')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{t('photoGuide.tip3')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{t('photoGuide.tip4')}</span>
                </li>
              </ul>
            </div>

            {/* Got it Button */}
            <button
              type="button"
              onClick={() => setShowPhotoGuide(false)}
              className="w-full py-3 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              {t('photoGuide.understood')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// PDF Generation Functions
async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const [, base64] = result.split(',');
        resolve(base64 ?? '');
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type TranslatorFn = (
  key: TranslationKey,
  replacements?: Record<string, string>
) => string;

async function generatePdf(
  results: TransformationResult[],
  contactName: string,
  treatmentType: 'teeth' | 'hair' = 'teeth',
  translate: TranslatorFn
) {
  if (!results.length) {
    throw new Error('No results to export');
  }
  const canvases: HTMLCanvasElement[] = [];
  for (const result of results) {
    const canvas = await renderResultCanvas(result, contactName, treatmentType, translate);
    canvases.push(canvas);
  }
  return createPdfFromCanvases(canvases);
}

async function renderResultCanvas(
  result: TransformationResult,
  contactName: string,
  treatmentType: 'teeth' | 'hair' = 'teeth',
  translate: TranslatorFn
) {
  const canvas = document.createElement('canvas');
  const width = 1120;
  const height = 1654;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to render PDF preview');
  }

  const backgroundColor = '#006069';
  const frameColor = '#0b5b64';
  const textColor = '#ffffff';

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  await renderHeader(ctx, width, translate);

  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.font = '32px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(
    translate('pdf.dear', { name: contactName || translate('pdf.guest') }),
    80,
    280
  );

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  const previewText =
    treatmentType === 'teeth'
      ? translate('pdf.smilePreview')
      : translate('pdf.hairPreview');
  ctx.fillText(previewText, 80, 320);

  const margin = 60;
  const gap = 40;
  const panelWidth = (width - margin * 2 - gap) / 2;
  const panelHeight = 1100;
  const panelY = 450;

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.fillText(translate('results.gallery.before'), margin, panelY - 20);
  await drawImagePanel(ctx, result.originalUrl, margin, panelY, panelWidth, panelHeight, frameColor);

  ctx.textAlign = 'left';
  ctx.fillText(
    translate('results.gallery.after'),
    margin + panelWidth + gap,
    panelY - 20
  );
  await drawImagePanel(
    ctx,
    result.transformedUrl,
    margin + panelWidth + gap,
    panelY,
    panelWidth,
    panelHeight,
    frameColor
  );

  // Footer
  ctx.textAlign = 'center';
  ctx.font = '28px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(translate('pdf.websiteLabel'), width / 2, height - 40);

  return canvas;
}

async function renderHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  translate: TranslatorFn
) {
  try {
    const logo = await loadImageElement(LOGO_URL);
    const maxLogoWidth = 380;
    const maxLogoHeight = 160;
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    
    // Logo ve "Design Studio" yan yana olacak şekilde konumlandır
    const totalWidth = logoWidth + 20 + 150; // logo + gap + text width
    const startX = (width - totalWidth) / 2;
    const topMargin = 80;

    // Logo çiz
    ctx.drawImage(logo, startX, topMargin, logoWidth, logoHeight);
    
    // "Design Studio" yazısı - logonun sağ üst kısmında
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(translate('hero.badge'), startX + logoWidth + 15, topMargin + 40);
  } catch {
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Natural Clinic', width / 2, 140);
    
    // Fallback durumunda da Design Studio yazısını ekle
    ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(translate('hero.badge'), width / 2, 190);
  }
}

async function drawImagePanel(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  frameColor: string
) {
  drawRoundedRect(ctx, x, y, width, height, 24, frameColor);

  const padding = 12;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const placeholderColor = '#0d4a51';

  if (!src) {
    ctx.fillStyle = placeholderColor;
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.fill();
    return;
  }

  try {
    const image = await loadImageElement(src);
    ctx.fillStyle = '#ffffff';
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.fill();
    ctx.save();
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.clip();
    drawImageWithinBox(ctx, image, innerX, innerY, innerWidth, innerHeight);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#f7f9fa';
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.fill();
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
) {
  ctx.fillStyle = color;
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawImageWithinBox(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  // CONTAIN yerine COVER:
  const scale = Math.max(width / image.width, height / image.height);

  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  // Ortadan kırparak hizala
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}



function canvasToImageBytes(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  const binary = atob(base64);
  const imgBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    imgBytes[i] = binary.charCodeAt(i);
  }
  return imgBytes;
}

function createPdfFromCanvases(canvases: HTMLCanvasElement[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  const push = (data: Uint8Array) => {
    chunks.push(data);
    currentOffset += data.length;
  };

  const pushString = (value: string) => {
    push(encoder.encode(value));
  };

  const startObject = () => {
    offsets.push(currentOffset);
  };

  pushString('%PDF-1.3\n');

  const pages = canvases.map((canvas) => ({
    width: canvas.width,
    height: canvas.height,
    imageBytes: canvasToImageBytes(canvas),
  }));

  const totalPages = pages.length;
  const totalObjects = 2 + totalPages * 3;

  startObject();
  pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject();
  const kidsRefs = pages
    .map((_, index) => `${3 + index * 3} 0 R`)
    .join(' ');
  pushString(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${totalPages} >>\nendobj\n`);

  pages.forEach((page, index) => {
    const pageObj = 3 + index * 3;
    const imageObj = pageObj + 1;
    const contentObj = pageObj + 2;
    const imageName = `/Im${index}`;

    startObject();
    pushString(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << ${imageName} ${imageObj} 0 R >> >> /MediaBox [0 0 ${page.width} ${page.height}] /Contents ${contentObj} 0 R >>\nendobj\n`
    );

    startObject();
    pushString(
      `${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.imageBytes.length} >>\nstream\n`
    );
    push(page.imageBytes);
    pushString('\nendstream\nendobj\n');

    const contentStream = `q
${page.width} 0 0 ${page.height} 0 0 cm
${imageName} Do
Q
`;
    const contentBytes = encoder.encode(contentStream);

    startObject();
    pushString(`${contentObj} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    push(contentBytes);
    pushString('endstream\nendobj\n');
  });

  const xrefOffset = currentOffset;
  pushString(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => {
    pushString(`${offset.toString().padStart(10, '0')} 00000 n \n`);
  });
  pushString('trailer\n<< /Size ');
  pushString(String(totalObjects + 1));
  pushString(' /Root 1 0 R >>\nstartxref\n');
  pushString(`${xrefOffset}\n%%EOF`);

  const totalLength = chunks.reduce((acc, arr) => acc + arr.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });

  return new Blob([merged], { type: 'application/pdf' });
}

async function loadImageElement(src: string) {
  const resolvedSrc = await getImageDataUrl(src);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.crossOrigin = 'anonymous';
    image.src = resolvedSrc;
  });
}

async function getImageDataUrl(src: string) {
  if (!src) {
    throw new Error('Missing image source');
  }

  if (src.startsWith('data:')) {
    return src;
  }
  if (src.startsWith('/')) {
    return src;
  }

  const cached = imageDataCache.get(src);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch('/api/image-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: src }),
    });

    if (!response.ok) {
      throw new Error('Failed to proxy image');
    }

    const data: { dataUrl?: string } = await response.json();
    if (!data.dataUrl) {
      throw new Error('Proxy did not return data URL');
    }

    imageDataCache.set(src, data.dataUrl);
    return data.dataUrl;
  } catch {
    return src;
  }
}
