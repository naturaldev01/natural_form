import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ZOHO_WEBHOOK_URL = 'https://flow.zoho.eu/20093756223/flow/webhook/incoming?zapikey=1001.415d875f40a21371ff9742e4b076dbf6.075db463c228738acb8c5085ba9b2dd5&isdebug=false';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, phone, email, pdfUrl, language } = body;

    // Input validation
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Zoho webhook'a gönder
    const response = await fetch(ZOHO_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email,
        pdf_url: pdfUrl || '',
        language: language || 'en',
        tags: ['ai-result'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zoho Webhook] Error response:', errorText);
      return NextResponse.json({ error: 'Zoho webhook failed', details: errorText }, { status: 500 });
    }

    const data = await response.text();
    console.log('[Zoho Webhook] Success:', data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Zoho Webhook] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send to Zoho',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

