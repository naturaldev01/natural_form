import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// CORS - restrict to same origin in production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.NEXT_PUBLIC_APP_URL || ''].filter(Boolean)
  : ['*'];

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins[0] || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const prompts: Record<string, string> = {
  teeth:
    "Transform this image to show perfect, white, aligned teeth. Make the teeth look naturally beautiful and professionally whitened. Keep the person's face and features exactly the same, only improve the teeth to look like they've had professional dental work. Maintain realistic lighting and natural appearance.",
  hair:
    "Transform this image to show fuller, healthier, more voluminous hair. Make the hair look professionally styled and treated. Keep the person's face and features exactly the same, only improve the hair to look thicker, healthier, and more vibrant. Maintain realistic lighting and natural appearance.",
};

const teethShadeDescriptions: Record<string, string> = {
  '0M1': 'the ultra bright 0M1 bleach shade',
  '0M2': 'the vibrant 0M2 bleach shade',
  '0M3': 'the natural-looking 0M3 bleach shade',
  'A1': 'the A1 warm reddish-brown shade',
  'A2': 'the A2 balanced natural shade',
  'A3': 'the A3 everyday natural shade',
  'A3.5': 'the A3.5 deeper natural shade',
  'A4': 'the A4 rich brownish shade',
  'B1': 'the B1 bright yellowish shade',
  'B2': 'the B2 creamy yellowish shade',
  'B3': 'the B3 honey yellowish shade',
  'B4': 'the B4 golden yellowish shade',
  'C1': 'the C1 soft grey shade',
  'C2': 'the C2 medium grey shade',
  'C3': 'the C3 deep grey shade',
  'C4': 'the C4 charcoal grey shade',
  'D2': 'the D2 cool reddish-grey shade',
  'D3': 'the D3 medium reddish-grey shade',
  'D4': 'the D4 deep reddish-grey shade',
};

const teethStyleDescriptions: Record<string, string> = {
  'AggressiveStyle': 'aggressive style with bold incisal edges',
  'DominantStyle': 'dominant style with pronounced central incisors',
  'EnhancedStyle': 'enhanced style with refined contours',
  'FocusedStyle': 'focused style emphasizing symmetry',
  'FunctionalStyle': 'functional style with practical contours',
  'HollywoodStyle': 'Hollywood style full, glamorous veneers',
  'MatureStyle': 'mature style with softened anatomy',
  'NaturalStyle': 'natural style with gentle texture',
  'OvalStyle': 'oval style with rounded corners',
  'SoftenedStyle': 'softened style with subtle transitions',
  'VigorousStyle': 'vigorous style with energetic shapes',
  'YouthfulStyle': 'youthful style with playful curvature',
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

const describeTeethShade = (value?: string) =>
  value ? teethShadeDescriptions[value] ?? value : undefined;

const describeTeethStyle = (value?: string) =>
  value ? teethStyleDescriptions[value] ?? value : undefined;

// URL validation
const URL_REGEX = /^https?:\/\/.+/i;
// Valid treatment types
const VALID_TREATMENT_TYPES = ['teeth', 'hair'];
// Valid teeth shades
const VALID_TEETH_SHADES = ['0M1', '0M2', '0M3', 'A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'];
// Valid teeth styles
const VALID_TEETH_STYLES = ['AggressiveStyle', 'DominantStyle', 'EnhancedStyle', 'FocusedStyle', 'FunctionalStyle', 'HollywoodStyle', 'MatureStyle', 'NaturalStyle', 'OvalStyle', 'SoftenedStyle', 'VigorousStyle', 'YouthfulStyle'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, treatmentType, teethShade, teethStyle } = body;

    // Input validation
    if (!imageUrl || typeof imageUrl !== 'string') {
      return buildResponse({ error: 'Image URL is required' }, 400);
    }

    if (!URL_REGEX.test(imageUrl)) {
      return buildResponse({ error: 'Invalid image URL format' }, 400);
    }

    // Only allow URLs from trusted domains (Supabase storage)
    const allowedDomains = ['supabase.co', 'supabase.in'];
    try {
      const urlObj = new URL(imageUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
      if (!isAllowed) {
        return buildResponse({ error: 'Image URL must be from Supabase storage' }, 400);
      }
    } catch {
      return buildResponse({ error: 'Invalid image URL' }, 400);
    }

    if (!treatmentType || typeof treatmentType !== 'string') {
      return buildResponse({ error: 'Treatment type is required' }, 400);
    }

    if (!VALID_TREATMENT_TYPES.includes(treatmentType)) {
      return buildResponse({ error: 'Invalid treatment type. Must be "teeth" or "hair"' }, 400);
    }

    // Validate teeth-specific fields
    if (treatmentType === 'teeth') {
      if (teethShade && !VALID_TEETH_SHADES.includes(teethShade)) {
        return buildResponse({ error: 'Invalid teeth shade value' }, 400);
      }
      if (teethStyle && !VALID_TEETH_STYLES.includes(teethStyle)) {
        return buildResponse({ error: 'Invalid teeth style value' }, 400);
      }
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return buildResponse({ error: 'Gemini API key not configured' }, 500);
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return buildResponse({ error: 'Failed to fetch image' }, 400);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    // Validate content type is an image
    if (!contentType.startsWith('image/')) {
      return buildResponse({ error: 'URL does not point to an image' }, 400);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // Check image size (max 10MB)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return buildResponse({ error: 'Image too large (max 10MB)' }, 400);
    }

    const base64Image = imageBuffer.toString('base64');
    const mimeType = contentType;

    let prompt =
      prompts[treatmentType as keyof typeof prompts] ??
      prompts.teeth;

    if (treatmentType === 'teeth') {
      const shadeDescription = describeTeethShade(teethShade);
      const styleDescription = describeTeethStyle(teethStyle);

      if (shadeDescription || styleDescription) {
        prompt += '\n';
      }
      if (shadeDescription) {
        prompt += `Use a tooth color that closely matches ${shadeDescription}. `;
      }
      if (styleDescription) {
        prompt += `Shape the smile to reflect a ${styleDescription} aesthetic.`;
      }
    }

    // Use Gemini 2.0 Flash Exp (Nano Banana) for image generation
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`,
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
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const details = await geminiResponse.text();
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
    return buildResponse(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
