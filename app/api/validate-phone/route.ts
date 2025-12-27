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
      console.warn('[validate-phone] TELNYX_API_KEY not configured, skipping validation');
      // API key yoksa validation'ı skip et - her zaman valid döndür
      return buildResponse({ 
        valid: true, 
        skipped: true,
        message: 'Phone validation skipped - API key not configured' 
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

    // Country code ile birleştir (+ işareti olmadan)
    const fullNumber = countryCode 
      ? `${countryCode.replace(/\D/g, '')}${cleanPhone}`
      : cleanPhone;

    // Telnyx Number Lookup API'yi çağır
    const telnyxUrl = `https://api.telnyx.com/v2/number_lookup/${encodeURIComponent(fullNumber)}`;
    
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

      // Diğer hatalar için validation'ı skip et (graceful degradation)
      console.warn('[validate-phone] Telnyx API failed, allowing through');
      return buildResponse({ 
        valid: true, 
        skipped: true,
        message: 'Validation skipped due to API error' 
      });
    }

    const data: TelnyxLookupResponse = await response.json();

    if (data.errors && data.errors.length > 0) {
      console.error('[validate-phone] Telnyx returned errors:', data.errors);
      return buildResponse({ 
        valid: false, 
        error: data.errors[0]?.detail || 'Phone validation failed',
        errorCode: data.errors[0]?.code || 'UNKNOWN'
      });
    }

    const isValid = data.data?.valid_number === true;

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
    // Hata durumunda graceful degradation - validation'ı skip et
    return buildResponse({ 
      valid: true, 
      skipped: true,
      message: 'Validation skipped due to error' 
    });
  }
}

