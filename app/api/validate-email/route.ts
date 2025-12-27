import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const EMAIL_API_KEY = process.env.EMAIL_API_KEY;

const buildResponse = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

interface EmailableResponse {
  email: string;
  state: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
  reason?: string;
  domain?: string;
  accept_all?: boolean;
  disposable?: boolean;
  free?: boolean;
  role?: boolean;
  mx_record?: string;
  smtp_provider?: string;
  score?: number;
}

export async function POST(req: Request) {
  try {
    if (!EMAIL_API_KEY) {
      console.warn('[validate-email] EMAIL_API_KEY not configured, skipping validation');
      // API key yoksa validation'ı skip et - her zaman valid döndür
      return buildResponse({ 
        valid: true, 
        skipped: true,
        message: 'Email validation skipped - API key not configured' 
      });
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return buildResponse({ error: 'Email is required', valid: false }, 400);
    }

    // Basit email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return buildResponse({ 
        valid: false, 
        error: 'Invalid email format',
        errorCode: 'INVALID_FORMAT'
      }, 400);
    }

    // Emailable API'yi çağır
    const emailableUrl = `https://api.emailable.com/v1/verify?email=${encodeURIComponent(email)}&api_key=${EMAIL_API_KEY}`;
    
    const response = await fetch(emailableUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[validate-email] Emailable API error:', response.status, errorText);
      
      // API hatası durumunda graceful degradation - validation'ı skip et
      console.warn('[validate-email] Emailable API failed, allowing through');
      return buildResponse({ 
        valid: true, 
        skipped: true,
        message: 'Validation skipped due to API error' 
      });
    }

    const data: EmailableResponse = await response.json();

    // Deliverable veya risky durumlarını kabul et
    // Sadece undeliverable olanları reddet
    const isValid = data.state === 'deliverable' || data.state === 'risky' || data.state === 'unknown';

    if (!isValid) {
      return buildResponse({
        valid: false,
        state: data.state,
        reason: data.reason,
        errorCode: 'UNDELIVERABLE',
      });
    }

    return buildResponse({
      valid: true,
      state: data.state,
      domain: data.domain,
      disposable: data.disposable,
      free: data.free,
      score: data.score,
    });

  } catch (error) {
    console.error('[validate-email] Unexpected error:', error);
    // Hata durumunda graceful degradation - validation'ı skip et
    return buildResponse({ 
      valid: true, 
      skipped: true,
      message: 'Validation skipped due to error' 
    });
  }
}

