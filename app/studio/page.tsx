'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { 
  Upload, Loader2, Download, X, CheckCircle, 
  ArrowRight, User, LogOut, RefreshCw, Trash2, Info, ImageIcon
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getCurrentUser, signOut, UserProfile, hasRole } from '@/lib/auth';

// PDF generation utilities
const LOGO_URL = '/assets/logo.png';
const imageDataCache = new Map<string, string>();

interface TransformationResult {
  originalUrl: string;
  transformedUrl: string;
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
  { value: 'AggressiveStyle', label: 'Aggressive Style' },
  { value: 'DominantStyle', label: 'Dominant Style' },
  { value: 'EnhancedStyle', label: 'Enhanced Style' },
  { value: 'FocusedStyle', label: 'Focused Style' },
  { value: 'FunctionalStyle', label: 'Functional Style' },
  { value: 'HollywoodStyle', label: 'Hollywood Style' },
  { value: 'MatureStyle', label: 'Mature Style' },
  { value: 'NaturalStyle', label: 'Natural Style' },
  { value: 'OvalStyle', label: 'Oval Style' },
  { value: 'SoftenedStyle', label: 'Softened Style' },
  { value: 'VigorousStyle', label: 'Vigorous Style' },
  { value: 'YouthfulStyle', label: 'Youthful Style' },
];

export default function StudioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [treatmentType, setTreatmentType] = useState<'teeth' | 'hair'>('teeth');
  const [teethShade, setTeethShade] = useState('0M1');
  const [teethStyle, setTeethStyle] = useState('HollywoodStyle');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  // Processing state
  const [transforming, setTransforming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TransformationResult[] | null>(null);
  
  // PDF download state
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const checkAuth = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      
      if (!userData || !userData.profile) {
        router.push('/login');
        return;
      }

      // Only sales, doctor, and admin can access this page
      if (!hasRole(userData.profile, ['admin', 'sales', 'doctor'])) {
        router.push('/');
        return;
      }

      // Check if approved
      if (!userData.profile.is_approved) {
        router.push('/login');
        return;
      }

      setProfile(userData.profile);
    } catch (err) {
      console.error('[Studio] Auth error:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch {
      // Logout failed silently
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    
    files.forEach((file) => {
      if (file.size <= 5 * 1024 * 1024) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setImages([...images, ...validFiles]);
      
      const previewPromises = validFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
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
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleTransform = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setTransforming(true);
    setError(null);

    try {
      const transformedResults: TransformationResult[] = [];
      const supabase = createClient();

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const fileExt = image.name.split('.').pop();
        const fileName = `studio-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `consultations/${fileName}`;

        // Upload image
        const { error: uploadError } = await supabase.storage
          .from('consultation-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('consultation-images')
          .getPublicUrl(filePath);

        // Transform image
        const transformResponse = await fetch('/api/transform-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: publicUrl,
            treatmentType,
            teethShade: treatmentType === 'teeth' ? teethShade : undefined,
            teethStyle: treatmentType === 'teeth' ? teethStyle : undefined,
          }),
        });

        const transformData = await transformResponse.json();

        if (!transformResponse.ok || !transformData?.transformedUrl) {
          throw new Error(transformData?.error || 'Failed to transform image');
        }

        transformedResults.push({
          originalUrl: publicUrl,
          transformedUrl: transformData.transformedUrl,
        });
      }

      setResults(transformedResults);
      setImages([]);
      setPreviews([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setTransforming(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!results) return;
    
    setDownloadingPdf(true);
    try {
      const pdfBlob = await generatePdf(results, profile?.first_name || 'Guest');
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `natural-clinic-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('PDF downloaded successfully!');
      setShowSuccessModal(true);
    } catch (err) {
      setError('Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setImages([]);
    setPreviews([]);
    setError(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' };
      case 'sales': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Sales' };
      case 'doctor': return { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Doctor' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: role };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
        <p className="text-gray-500 text-sm">Loading studio...</p>
      </div>
    );
  }

  if (!profile) return null;

  const roleBadge = getRoleBadge(profile.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NextImage
              src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
              alt="Natural Clinic"
              width={150}
              height={50}
              priority
            />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-gray-300">|</span>
              <span className="text-[#006069] font-semibold">Design Studio</span>
              <span className={`${roleBadge.bg} ${roleBadge.text} text-xs px-2 py-1 rounded-full font-medium`}>
                {roleBadge.label}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-[#006069] transition-colors"
            >
              Dashboard →
            </a>
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">{profile.first_name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Internal Tool - No Lead Submission</p>
            <p className="text-sm text-blue-600 mt-1">
              This studio is for demonstrations only. Results will NOT be sent to Zoho CRM. 
              Use the public form at <a href="/teeth" className="underline">natural.clinic/teeth</a> for lead generation.
            </p>
          </div>
        </div>

        {!results ? (
          /* Upload & Transform Section */
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Smile Design Studio</h1>
            
            {/* Treatment Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Treatment Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTreatmentType('teeth')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium ${
                    treatmentType === 'teeth'
                      ? 'border-[#006069] bg-[#006069]/5 text-[#006069]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  😁 Teeth Whitening
                </button>
                <button
                  onClick={() => setTreatmentType('hair')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium ${
                    treatmentType === 'hair'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  💇 Hair Transplant
                </button>
              </div>
            </div>

            {/* Teeth Options */}
            {treatmentType === 'teeth' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shade</label>
                  <select
                    value={teethShade}
                    onChange={(e) => setTeethShade(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069]"
                  >
                    {TEETH_SHADES.map((shade) => (
                      <option key={shade.value} value={shade.value}>
                        {shade.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                  <select
                    value={teethStyle}
                    onChange={(e) => setTeethStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069]"
                  >
                    {TEETH_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#006069] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  multiple
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                  <p className="text-gray-400 text-sm mt-1">PNG, JPG up to 5MB</p>
                </label>
              </div>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Images ({previews.length})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Transform Button */}
            <button
              onClick={handleTransform}
              disabled={images.length === 0 || transforming}
              className={`w-full py-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                treatmentType === 'teeth'
                  ? 'bg-[#006069] hover:bg-[#004750] text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {transforming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Transforming...
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5" />
                  Transform Image{images.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Transformation Results</h2>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Transformation
                </button>
              </div>

              {/* Before/After */}
              <div className="space-y-8">
                {results.map((result, index) => (
                  <div key={index} className="space-y-4">
                    {results.length > 1 && (
                      <h3 className="text-lg font-semibold text-gray-700">Image {index + 1}</h3>
                    )}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600 text-center">Before</p>
                        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                          <img
                            src={result.originalUrl}
                            alt="Before"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                      
                      <ArrowRight className="w-8 h-8 text-[#006069]" />
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600 text-center">After</p>
                        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                          <img
                            src={result.transformedUrl}
                            alt="After"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Success!</h3>
              <p className="text-gray-600 mt-2">{successMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PDF Generation Functions (copied from ResultsDisplay)
// ============================================

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
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

async function generatePdf(results: TransformationResult[], contactName: string): Promise<Blob> {
  if (!results.length) throw new Error('No results to export');
  const canvases: HTMLCanvasElement[] = [];
  for (const result of results) {
    const canvas = await renderResultCanvas(result, contactName);
    canvases.push(canvas);
  }
  return createPdfFromCanvases(canvases);
}

async function renderResultCanvas(result: TransformationResult, contactName: string): Promise<HTMLCanvasElement> {
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

  await renderHeader(ctx, width);

  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.font = '32px "Helvetica Neue", Arial, sans-serif';
  const greeting = contactName?.trim() ? `Dear ${contactName},` : 'Dear Guest,';
  ctx.fillText(greeting, 80, 280);

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Here is your personalized smile design preview', 80, 320);

  const margin = 60;
  const gap = 40;
  const panelWidth = (width - margin * 2 - gap) / 2;
  const panelHeight = 1100;
  const panelY = 450;

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.fillText('Before', margin, panelY - 20);
  await drawImagePanel(ctx, result.originalUrl, margin, panelY, panelWidth, panelHeight, frameColor);

  ctx.fillText('After', margin + panelWidth + gap, panelY - 20);
  await drawImagePanel(ctx, result.transformedUrl, margin + panelWidth + gap, panelY, panelWidth, panelHeight, frameColor);

  ctx.textAlign = 'center';
  ctx.font = '28px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('www.natural.clinic', width / 2, height - 40);

  return canvas;
}

async function renderHeader(ctx: CanvasRenderingContext2D, width: number): Promise<void> {
  try {
    const logo = await loadImageElement(LOGO_URL);
    const maxLogoWidth = 420;
    const maxLogoHeight = 180;
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    const logoX = (width - logoWidth) / 2;
    const topMargin = 80;

    ctx.drawImage(logo, logoX, topMargin, logoWidth, logoHeight);
  } catch {
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Natural Clinic', width / 2, 140);
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
): Promise<void> {
  drawRoundedRect(ctx, x, y, width, height, 24, frameColor);

  const padding = 12;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  if (!src) {
    ctx.fillStyle = '#0d4a51';
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
  } catch (error) {
    console.error('Failed to draw image', error);
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
): void {
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
): void {
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
): void {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function canvasToImageBytes(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  const binary = atob(base64);
  const imgBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    imgBytes[i] = binary.charCodeAt(i);
  }
  return imgBytes;
}

function createPdfFromCanvases(canvases: HTMLCanvasElement[]): Blob {
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
  const kidsRefs = pages.map((_, index) => `${3 + index * 3} 0 R`).join(' ');
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

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const resolvedSrc = await getImageDataUrl(src);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.crossOrigin = 'anonymous';
    image.src = resolvedSrc;
  });
}

async function getImageDataUrl(src: string): Promise<string> {
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
      headers: { 'Content-Type': 'application/json' },
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
  } catch (error) {
    console.error('Image proxy failed', error);
    return src;
  }
}
