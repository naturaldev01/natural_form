import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const prompts: Record<string, string> = {
  teeth:
    "Transform this image to show perfect, white, aligned teeth. Make the teeth look naturally beautiful and professionally whitened. Keep the person's face and features exactly the same, only improve the teeth to look like they've had professional dental work. Maintain realistic lighting and natural appearance.",
  hair:
    "Transform this image to show fuller, healthier, more voluminous hair. Make the hair look professionally styled and treated. Keep the person's face and features exactly the same, only improve the hair to look thicker, healthier, and more vibrant. Maintain realistic lighting and natural appearance.",
};

const buildResponse = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const { imageUrl, treatmentType } = await req.json();

    if (!imageUrl || !treatmentType) {
      return buildResponse({ error: 'Missing required fields' }, 400);
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return buildResponse({ error: 'Gemini API key not configured' }, 500);
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return buildResponse({ error: 'Failed to fetch image' }, 400);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg';

    const prompt =
      prompts[treatmentType as keyof typeof prompts] ??
      prompts.teeth;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const details = await geminiResponse.text();
      console.error('Gemini API error:', details);
      return buildResponse(
        {
          error: 'Failed to process image with Gemini API',
          details,
        },
        500
      );
    }

    const geminiData = await geminiResponse.json();
    const candidate = geminiData.candidates?.[0];

    if (!candidate) {
      return buildResponse({ error: 'No response from Gemini API' }, 500);
    }

    const parts = candidate.content?.parts || [];
    let transformedImageData: string | null = null;

    for (const part of parts) {
      if (part.inline_data?.data) {
        transformedImageData = part.inline_data.data;
        break;
      }

      if (part.inlineData?.data) {
        transformedImageData = part.inlineData.data;
        break;
      }
    }

    if (!transformedImageData) {
      const textParts = parts
        .filter((p: { text?: string }) => p.text)
        .map((p: { text?: string }) => p.text)
        .join(' ');

      console.log('Gemini text response:', textParts);
      return buildResponse(
        {
          transformedUrl: imageUrl,
          warning: 'Image transformation completed but no new image was generated',
        },
        200
      );
    }

    const transformedUrl = `data:image/png;base64,${transformedImageData}`;
    return buildResponse({ transformedUrl });
  } catch (error) {
    console.error('Error transforming image:', error);
    return buildResponse(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
