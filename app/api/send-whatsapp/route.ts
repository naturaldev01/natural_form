import { NextRequest, NextResponse } from 'next/server';

// Validation
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, pdfUrl, firstName, lastName } = body;

    // Get environment variables
    const accessToken = process.env.NEXT_PUBLIC_WP_TOKEN;
    const phoneNumberId = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER;
    const apiBase = process.env.NEXT_PUBLIC_WP_API_BASE || 'https://graph.facebook.com';
    const apiVersion = process.env.NEXT_PUBLIC_WP_API_VERSION || 'v22.0';

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp API not configured' },
        { status: 500 }
      );
    }
    
    const WHATSAPP_API_URL = `${apiBase}/${apiVersion}`;

    // Validate phone number
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (!PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!pdfUrl || typeof pdfUrl !== 'string') {
      return NextResponse.json(
        { error: 'PDF URL is required' },
        { status: 400 }
      );
    }

    if (!firstName || typeof firstName !== 'string') {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    if (!lastName || typeof lastName !== 'string') {
      return NextResponse.json(
        { error: 'Last name is required' },
        { status: 400 }
      );
    }

    // Format phone number for WhatsApp API (remove + if present)
    const formattedPhone = cleanPhone.startsWith('+') 
      ? cleanPhone.substring(1) 
      : cleanPhone;

    // Send template message via WhatsApp Cloud API
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'new_look_ready',
            language: { code: 'en_US' },
            components: [
              {
                type: 'header',
                parameters: [
                  {
                    type: 'document',
                    document: {
                      link: pdfUrl,
                      filename: 'Smile_Design_Result.pdf',
                    },
                  },
                ],
              },
              {
                type: 'body',
                parameters: [
                  { type: 'text', parameter_name: 'first_name', text: firstName },
                  { type: 'text', parameter_name: 'last_name', text: lastName },
                ],
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    // Debug log - remove after testing
    console.log('WhatsApp API Response:', JSON.stringify(data, null, 2));
    console.log('Request payload:', JSON.stringify({
      to: formattedPhone,
      template: 'new_look_ready',
      firstName,
      lastName,
      pdfUrl
    }, null, 2));

    if (!response.ok) {
      const errorMessage = data?.error?.message || 'Failed to send WhatsApp message';
      console.error('WhatsApp API Error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage, details: data?.error },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.messages?.[0]?.id,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
