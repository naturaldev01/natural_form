import { NextRequest, NextResponse } from 'next/server';

// WhatsApp Webhook Verification Token (Meta'da ayarladığın token ile aynı olmalı)
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'natural_clinic_webhook_2024';

// GET - Webhook verification (Meta bu endpoint'i doğrulamak için kullanır)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    // Webhook doğrulandı
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST - Incoming webhook events (mesaj durumu, gelen mesajlar vs.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Webhook event'lerini logla (production'da bunu database'e kaydet)
    const entries = body?.entry || [];
    
    for (const entry of entries) {
      const changes = entry?.changes || [];
      
      for (const change of changes) {
        const value = change?.value;
        
        // Mesaj durumu güncellemesi
        if (value?.statuses) {
          for (const status of value.statuses) {
            // Status: sent, delivered, read, failed
            const messageStatus = {
              messageId: status.id,
              status: status.status,
              timestamp: status.timestamp,
              recipientId: status.recipient_id,
              conversationId: status.conversation?.id,
              error: status.errors?.[0],
            };
            
            // Burada database'e kaydedebilirsin
            // Şimdilik sadece console'a yazdırıyoruz (Vercel logs'ta görünecek)
            console.log('📱 WhatsApp Status Update:', JSON.stringify(messageStatus, null, 2));
          }
        }
        
        // Gelen mesajlar
        if (value?.messages) {
          for (const message of value.messages) {
            const incomingMessage = {
              messageId: message.id,
              from: message.from,
              timestamp: message.timestamp,
              type: message.type,
              text: message.text?.body,
            };
            
            console.log('📨 Incoming WhatsApp Message:', JSON.stringify(incomingMessage, null, 2));
          }
        }
      }
    }

    // WhatsApp her zaman 200 bekler
    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    // Hata olsa bile 200 dön, yoksa WhatsApp retry yapar
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}

