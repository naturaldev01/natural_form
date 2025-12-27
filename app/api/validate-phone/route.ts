import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

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

interface TelnyxLookupResponse {
  data: {
    phone_number: string;
    national_format: string;
    country_code: string;
    carrier?: {
      name: string;
      type: string;
    };
    valid_number: boolean;
    caller_name?: {
      caller_name: string;
      error_code: string | null;
    };
  };
  errors?: Array<{
    code: string;
    title: string;
    detail: string;
  }>;
}

export async function POST(req: Request) {
  try {
    if (!TELNYX_API_KEY) {
      console.error('[validate-phone] TELNYX_API_KEY not configured');
      // API key yoksa validation başarısız
      return buildResponse({ 
        valid: false, 
        skipped: true,
        error: 'Phone validation service not configured' 
      });
    }

    const body = await req.json();
    const { phoneNumber, countryCode } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return buildResponse({ error: 'Phone number is required', valid: false }, 400);
    }

    // Telefon numarasını temizle - sadece rakamları al
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length < 7) {
      return buildResponse({ 
        valid: false, 
        error: 'Phone number is too short',
        errorCode: 'TOO_SHORT'
      }, 400);
    }

    if (cleanPhone.length > 15) {
      return buildResponse({ 
        valid: false, 
        error: 'Phone number is too long',
        errorCode: 'TOO_LONG'
      }, 400);
    }

    // Şüpheli pattern kontrolü - sahte/test numaralarını tespit et
    const isSuspiciousPattern = (phone: string): boolean => {
      // Tüm rakamlar aynı mı? (5555555555, 1111111111)
      if (/^(\d)\1+$/.test(phone)) return true;
      // Bilinen test numaraları
      if (phone === '1234567890' || phone === '0123456789') return true;
      // Aynı rakam 5+ kez üst üste tekrar ediyor mu?
      if (/(\d)\1{4,}/.test(phone)) return true;
      return false;
    };

    if (isSuspiciousPattern(cleanPhone)) {
      console.warn('[validate-phone] Suspicious pattern detected:', cleanPhone);
      return buildResponse({ 
        valid: false, 
        error: 'Invalid phone number pattern',
        errorCode: 'SUSPICIOUS_PATTERN'
      }, 400);
    }

    // Country code ile birleştir (+ işareti ile - Telnyx E.164 formatı bekliyor)
    const fullNumber = countryCode 
      ? `+${countryCode.replace(/\D/g, '')}${cleanPhone}`
      : `+${cleanPhone}`;

    // Telnyx Number Lookup API'yi çağır (type=carrier ile carrier bilgisi alınır)
    const telnyxUrl = `https://api.telnyx.com/v2/number_lookup/${encodeURIComponent(fullNumber)}?type=carrier`;
    
    const response = await fetch(telnyxUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[validate-phone] Telnyx API error:', response.status, errorText);
      
      // 404 - numara bulunamadı = geçersiz numara
      if (response.status === 404) {
        return buildResponse({ 
          valid: false, 
          error: 'Invalid phone number',
          errorCode: 'NOT_FOUND'
        });
      }

      // 422 - geçersiz format
      if (response.status === 422) {
        return buildResponse({ 
          valid: false, 
          error: 'Invalid phone number format',
          errorCode: 'INVALID_FORMAT'
        });
      }

      // Diğer API hatalarında validation başarısız
      console.error('[validate-phone] Telnyx API failed');
      return buildResponse({ 
        valid: false, 
        skipped: true,
        error: 'Phone validation service error' 
      });
    }

    const data: TelnyxLookupResponse = await response.json();
    
    // DEBUG: Telnyx yanıtını logla
    console.log('[validate-phone] Telnyx response for', fullNumber, ':', JSON.stringify(data, null, 2));

    if (data.errors && data.errors.length > 0) {
      console.error('[validate-phone] Telnyx returned errors:', data.errors);
      return buildResponse({ 
        valid: false, 
        error: data.errors[0]?.detail || 'Phone validation failed',
        errorCode: data.errors[0]?.code || 'UNKNOWN'
      });
    }

    const isValid = data.data?.valid_number === true;
    const hasCarrier = !!data.data?.carrier?.name;

    console.log('[validate-phone] Result:', fullNumber, '-> valid:', isValid, ', carrier:', data.data?.carrier?.name || 'none');

    // Carrier bilgisi yoksa şüpheli - gerçek numaralarda operatör bilgisi olmalı
    if (isValid && !hasCarrier) {
      console.warn('[validate-phone] No carrier info, rejecting:', fullNumber);
      return buildResponse({ 
        valid: false, 
        error: 'Phone number could not be verified',
        errorCode: 'NO_CARRIER'
      });
    }

    return buildResponse({
      valid: isValid,
      phoneNumber: data.data?.phone_number,
      nationalFormat: data.data?.national_format,
      countryCode: data.data?.country_code,
      carrier: data.data?.carrier?.name,
      carrierType: data.data?.carrier?.type,
    });

  } catch (error) {
    console.error('[validate-phone] Unexpected error:', error);
    // Hata durumunda validation başarısız
    return buildResponse({ 
      valid: false, 
      skipped: true,
      error: 'Phone validation failed' 
    });
  }
}

