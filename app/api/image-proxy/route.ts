import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// URL validation
const URL_REGEX = /^https?:\/\/.+/i;
// Allowed domains for image proxy
const ALLOWED_DOMAINS = ['supabase.co', 'supabase.in', 'natural.clinic'];
// Max image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    // Input validation
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!URL_REGEX.test(url)) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Only allow URLs from trusted domains
    try {
      const urlObj = new URL(url);
      const isAllowed = ALLOWED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
      if (!isAllowed) {
        return NextResponse.json({ error: 'URL domain not allowed' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Validate content type is an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Check file size
    if (buffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

    return NextResponse.json({ dataUrl });
  } catch {
    return NextResponse.json({ error: 'Unable to process image' }, { status: 500 });
  }
}
