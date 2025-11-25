'use client';

import { useState } from 'react';
import { ArrowRight, Download } from 'lucide-react';

interface Result {
  originalUrl: string;
  transformedUrl: string;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
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
}

const LOGO_URL = 'https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp';
const imageDataCache = new Map<string, string>();

export default function ResultsDisplay({ results, onReset, contact, preferences }: ResultsDisplayProps) {
  const [downloading, setDownloading] = useState(false);
  const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Valued Guest';

  const generatePdf = async (result: Result) => {
    const canvas = await renderResultCanvas(result, contactName);
    return createPdfFromCanvas(canvas);
  };

  const triggerDownload = (blob: Blob, index: number) => {
    const fileNameSafe = contactName.replace(/\s+/g, '-').toLowerCase() || 'transformation';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `natural-clinic-${fileNameSafe}-${index + 1}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSingleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const pdfBlob = await generatePdf(results[0]);
      triggerDownload(pdfBlob, 0);
    } catch (error) {
      console.error('Failed to generate PDF', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAll = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      for (let i = 0; i < results.length; i++) {
        const pdfBlob = await generatePdf(results[i]);
        triggerDownload(pdfBlob, i);
      }
    } catch (error) {
      console.error('Failed to download PDFs', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Transformation{results.length > 1 ? 's' : ''}</h2>
        <p className="text-gray-600">See the difference our treatment can make</p>
        {preferences?.teethShade && (
          <p className="text-sm text-gray-500 mt-2">
            Preferred shade: <span className="font-semibold">{preferences.teethShade}</span>
            {preferences.teethStyle && (
              <>
                {' '}• Smile style:{' '}
                <span className="font-semibold">{formatStyleLabel(preferences.teethStyle)}</span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="space-y-8">
        {results.map((result, index) => (
          <div key={index} className="space-y-4">
            {results.length > 1 && (
              <h3 className="text-lg font-semibold text-gray-700">Image {index + 1}</h3>
            )}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
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

              <div className="flex justify-center">
                <ArrowRight className="w-12 h-12 text-[#006069]" />
              </div>

              <div className="space-y-3">
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
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'Preparing PDFs...' : 'Download All Results'}
          </button>
        ) : (
          <button
            onClick={handleSingleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'Preparing PDF...' : 'Download Result'}
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

async function renderResultCanvas(result: Result, contactName: string) {
  const canvas = document.createElement('canvas');
  const width = 1120;
  const height = 1654;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to render PDF preview');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  await renderHeader(ctx, width);

  ctx.textAlign = 'left';
  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Personal Design For:', 120, 260);
  ctx.font = 'italic 30px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(contactName || 'Valued Guest', 120, 305);

  const boxWidth = (width - 320) / 2;
  const boxHeight = boxWidth * 0.78;
  const boxY = 420;
  const beforeX = 120;
  const afterX = width - 120 - boxWidth;

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f5f64';
  ctx.fillText('Before', beforeX, boxY - 20);
  ctx.textAlign = 'right';
  ctx.fillText('After', afterX + boxWidth, boxY - 20);

  await Promise.all([
    drawImagePanel(ctx, result.originalUrl, beforeX, boxY, boxWidth, boxHeight),
    drawImagePanel(ctx, result.transformedUrl, afterX, boxY, boxWidth, boxHeight),
  ]);

  ctx.textAlign = 'center';
  ctx.font = '28px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#0f5f64';
  ctx.fillText('www.natural.clinic', width / 2, height - 120);

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

    ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f5f64';
    ctx.fillText('Design Studio', logoX + logoWidth + 20, topMargin + 30);
  } catch {
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#0f5f64';
    ctx.fillText('Natural Clinic Design Studio', width / 2, 140);
  }
}

async function drawImagePanel(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  drawRoundedRect(ctx, x, y, width, height, 24, '#e6ecec');

  const innerX = x + 16;
  const innerY = y + 16;
  const innerWidth = width - 32;
  const innerHeight = height - 32;

  if (!src) {
    ctx.fillStyle = '#f7f9fa';
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.fill();
    return;
  }

  try {
    const image = await loadImageElement(src);
    ctx.fillStyle = '#f7f9fa';
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

function formatStyleLabel(style: string) {
  if (!style) return '';
  return style.replace(/([A-Z])/g, ' $1').replace(/Style$/, ' Style').trim();
}

async function loadImageElement(src: string) {
  const resolvedSrc = await getImageDataUrl(src);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
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
