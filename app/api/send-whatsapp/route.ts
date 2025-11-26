import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { pdfUrl, toPhone, caption, filename } = await req.json();

    if (!pdfUrl || !toPhone) {
      return NextResponse.json({ error: 'Missing pdfUrl or toPhone' }, { status: 400 });
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'WhatsApp credentials not configured' }, { status: 500 });
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'document',
        document: {
          link: pdfUrl,
          filename: filename || 'natural-clinic-transformation.pdf',
          caption: caption || 'Your transformation is ready.',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp API response:', errorText);
      return NextResponse.json({ error: 'WhatsApp API error', details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
