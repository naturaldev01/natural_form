import { NextResponse } from 'next/server';

// This API route is deprecated - WhatsApp sharing now uses direct wa.me links
// The client-side implementation opens WhatsApp Web/App directly with a pre-filled message
// This approach doesn't require Meta Cloud API setup and works on any device

export async function POST() {
  return NextResponse.json({ 
    message: 'WhatsApp sharing is now handled client-side via wa.me links',
    deprecated: true 
  }, { status: 410 });
}
