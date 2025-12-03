'use client';

import { useState } from 'react';
import { ArrowRight, Mail, X, CheckCircle, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Result {
  originalUrl: string;
  transformedUrl: string;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Preferences {
  teethShade?: string;
  teethStyle?: string;
}

interface ResultsDisplayProps {
  results: Result[];
  onReset: () => void;
  contact?: ContactInfo | null;
  preferences?: Preferences | null;
  locked?: boolean;
  onUnlock?: (info: ContactInfo) => void;
}

const LOGO_URL = '/assets/logo.png';
const imageDataCache = new Map<string, string>();

export default function ResultsDisplay({ 
  results, 
  onReset, 
  preferences 
}: ResultsDisplayProps) {
  const [contactInfo, setContactInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingWhatsApp, setSubmittingWhatsApp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isContactComplete = () => {
    return (
      contactInfo.firstName.trim() !== '' &&
      contactInfo.lastName.trim() !== '' &&
      contactInfo.email.trim() !== '' &&
      contactInfo.phone.trim() !== ''
    );
  };

  const saveToDatabase = async () => {
      for (const result of results) {
        const { error: dbError } = await supabase.from('consultations').insert({
          first_name: contactInfo.firstName.trim(),
          last_name: contactInfo.lastName.trim(),
          email: contactInfo.email.trim(),
          phone: contactInfo.phone.trim(),
          treatment_type: preferences?.teethShade ? 'teeth' : 'hair',
          original_image_url: result.originalUrl,
          transformed_image_url: result.transformedUrl,
        });

        if (dbError) throw dbError;
      }
  };

  const handleSendEmail = async () => {
    if (!isContactComplete()) return;
    
    setSubmitting(true);

    try {
      // Veritabanına kaydet
      await saveToDatabase();

      // PDF oluştur ve mail gönder
      const pdfBlob = await generatePdf(results[0], `${contactInfo.firstName} ${contactInfo.lastName}`);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const filename = `natural-clinic-${Date.now()}.pdf`;
      const contactName = `${contactInfo.firstName} ${contactInfo.lastName}`.trim();
      
      const response = await fetch('/api/send-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64,
          filename,
          toEmail: contactInfo.email,
          contactName,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }

      setIsUnlocked(true);
      setSuccessMessage('Results sent to your email!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!isContactComplete()) return;
    
    setSubmittingWhatsApp(true);

    try {
      // Veritabanına kaydet
      await saveToDatabase();

      // PDF oluştur
      const pdfBlob = await generatePdf(results[0], `${contactInfo.firstName} ${contactInfo.lastName}`);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const filename = `natural-clinic-${contactInfo.firstName.toLowerCase()}-${contactInfo.lastName.toLowerCase()}.pdf`;
      const contactName = `${contactInfo.firstName} ${contactInfo.lastName}`.trim();
      
      // PDF'i Supabase Storage'a yükle
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('consultation-images')
        .upload(`pdfs/${filename}`, await (await fetch(`data:application/pdf;base64,${pdfBase64}`)).blob(), {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload PDF');
      }

      // Public URL al
      const { data: urlData } = supabase.storage
        .from('consultation-images')
        .getPublicUrl(uploadData.path);

      const pdfUrl = urlData.publicUrl;

      // WhatsApp mesajı oluştur
      const message = `Hello ${contactName}! 👋

Thank you for visiting Natural Clinic Design Studio! ✨

Here is your personalized smile transformation preview:
${pdfUrl}

We're excited to help you achieve your dream smile! 😊

📞 Contact us for a free consultation
🌐 www.natural.clinic

Best regards,
Natural Clinic Team`;

      // Telefon numarasını temizle
      let cleanPhone = contactInfo.phone.replace(/[^0-9+]/g, '');
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }

      // WhatsApp web linkini aç
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      setIsUnlocked(true);
      setSuccessMessage('WhatsApp opened! Send the message to share your results.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to prepare WhatsApp message. Please try again.');
    } finally {
      setSubmittingWhatsApp(false);
    }
  };

  const formatStyleLabel = (style: string) => {
    if (!style) return '';
    return style.replace(/([A-Z])/g, ' $1').replace(/Style$/, ' Style').trim();
  };

  return (
    <div className="space-y-8 relative">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Your Transformation{results.length > 1 ? 's' : ''}
        </h2>
        <p className="text-gray-600">See the difference our treatment can make</p>
        {preferences?.teethShade && (
          <p className="text-sm text-gray-500 mt-2">
            Preferred color: <span className="font-semibold">{preferences.teethShade}</span>
            {preferences.teethStyle && (
              <>
                {' '}• Smile style:{' '}
                <span className="font-semibold">{formatStyleLabel(preferences.teethStyle)}</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Before/After Display - Always blurred until unlocked */}
      <div className="space-y-8">
        {results.map((result, index) => (
          <div key={index} className="space-y-4">
            {results.length > 1 && (
              <h3 className="text-lg font-semibold text-gray-700">Image {index + 1}</h3>
            )}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-700 text-center">Before</h4>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                  <img
                    src={result.originalUrl}
                    alt={`Original ${index + 1}`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-12 h-12 text-[#006069]" />
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-700 text-center">After</h4>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                  <img
                    src={result.transformedUrl}
                    alt={`Transformed ${index + 1}`}
                    className={`w-full h-auto object-cover transition-all duration-500 ${
                      !isUnlocked ? 'blur-xl scale-105' : 'blur-0 scale-100'
                    }`}
                  />
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#006069]/30 to-[#004750]/40 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center text-white bg-[#006069]/90 px-6 py-3 rounded-xl shadow-lg">
                        <p className="font-semibold text-sm">Enter your details to unlock</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pop-up Modal for Contact Form */}
      {!isUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 animate-in zoom-in duration-300 border border-gray-100">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#006069] to-[#004750] rounded-full mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Almost There!</h3>
              <p className="text-gray-600">Enter your details to receive your transformation results via email</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={contactInfo.firstName}
                    onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={contactInfo.lastName}
                    onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] focus:bg-white transition-all"
                  placeholder="+90 555 123 4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSendEmail}
                disabled={!isContactComplete() || submitting || submittingWhatsApp}
                className="py-4 px-4 bg-gradient-to-r from-[#006069] to-[#004750] hover:from-[#004750] hover:to-[#003840] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Send via Email
                </>
              )}
            </button>

              <button
                onClick={handleSendWhatsApp}
                disabled={!isContactComplete() || submitting || submittingWhatsApp}
                className="py-4 px-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
              >
                {submittingWhatsApp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    Send via WhatsApp
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Your information will be kept secure and used only for consultation purposes.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons - Visible when unlocked */}
      {isUnlocked && (
        <div className="space-y-4">
          <button
            onClick={onReset}
            className="w-full px-6 py-4 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            Start New Consultation
          </button>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900">
                Success!
              </h3>
              
              <p className="text-gray-600 text-lg">
                {successMessage}
              </p>
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

async function generatePdf(result: { originalUrl: string; transformedUrl: string }, contactName: string) {
  const canvas = await renderResultCanvas(result, contactName);
  return createPdfFromCanvas(canvas);
}

async function renderResultCanvas(result: { originalUrl: string; transformedUrl: string }, contactName: string) {
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
  const greeting = contactName?.trim()
    ? `Dear ${contactName},`
    : 'Dear Guest,';
  ctx.fillText(greeting, 80, 280);

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Here is your personalized smile design preview', 80, 320);

  const margin = 60;
  const gap = 40;
  const panelWidth = (width - margin * 2 - gap) / 2;
  const panelHeight = 1100;
  const panelY = 360;

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.fillText('Before', margin, panelY - 20);
  await drawImagePanel(ctx, result.originalUrl, margin, panelY, panelWidth, panelHeight, frameColor);

  ctx.fillText('After', margin + panelWidth + gap, panelY - 20);
  await drawImagePanel(
    ctx,
    result.transformedUrl,
    margin + panelWidth + gap,
    panelY,
    panelWidth,
    panelHeight,
    frameColor
  );

  ctx.textAlign = 'center';
  ctx.font = '28px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('www.natural.clinic', width / 2, height - 40);

  return canvas;
}

async function renderHeader(ctx: CanvasRenderingContext2D, width: number) {
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
) {
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
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function createPdfFromCanvas(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  const binary = atob(base64);
  const imgBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    imgBytes[i] = binary.charCodeAt(i);
  }
  return createPdfFromImageBytes(imgBytes, canvas.width, canvas.height);
}

function createPdfFromImageBytes(imageBytes: Uint8Array, width: number, height: number) {
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

  startObject();
  pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject();
  pushString('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  startObject();
  pushString(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R >>\nendobj\n`
  );

  startObject();
  pushString(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  push(imageBytes);
  pushString('\nendstream\nendobj\n');

  const contentStream = `q
${width} 0 0 ${height} 0 0 cm
/Im0 Do
Q
`;
  const contentBytes = encoder.encode(contentStream);

  startObject();
  pushString(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  pushString('endstream\nendobj\n');

  const xrefOffset = currentOffset;
  pushString('xref\n0 6\n0000000000 65535 f \n');
  offsets.forEach((offset) => {
    pushString(`${offset.toString().padStart(10, '0')} 00000 n \n`);
  });
  pushString('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n');
  pushString(`${xrefOffset}\n%%EOF`);

  return new Blob([concatUint8Arrays(chunks)], { type: 'application/pdf' });
}

function concatUint8Arrays(arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((acc, array) => acc + array.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((array) => {
    merged.set(array, offset);
    offset += array.length;
  });
  return merged;
}

async function loadImageElement(src: string) {
  const resolvedSrc = await getImageDataUrl(src);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
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
  } catch (error) {
    console.error('Image proxy failed', error);
    return src;
  }
}
