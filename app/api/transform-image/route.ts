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

/* -------------------------------------------------------
   BASE PROMPTS (revized & clinic-grade)
------------------------------------------------------- */
const prompts: Record<string, string> = {
  teeth: `
Enhance only the teeth of the person in this photo.

Goals:
- Make the teeth look straight, well aligned and naturally shaped.
- Whiten and refine the teeth to a professional but realistic shade.
- Improve symmetry and surface quality while keeping a natural enamel texture.

Strict rules:
- Do NOT change the person's face, lips, eyes, skin tone or expression.
- Do NOT change the mouth position or smile width.
- Do NOT modify the hair, background, clothing or lighting.
- Avoid overly bright, glowing or plastic-looking teeth.

Target look:
- A realistic, high-end dental clinic “after treatment” result.
`.trim(),

hair: `
Enhance ONLY the hair of the person in this photo.

General Goals:
- Improve fullness, density, and overall healthy appearance.
- Reduce visible scalp while maintaining realism.
- Smooth frizz/flyaways while keeping the natural texture and original color.
- Respect the person’s natural hair type (straight, wavy, curly, coily, afro-textured).

Ethnic & Texture Adaptation:
- Automatically detect the individual's hair type and ethnicity-related characteristics.
- For afro-textured or tightly coiled hair: increase volume and definition without changing the curl pattern; avoid artificial shine or straightening.
- For curly/wavy hair: enhance curl definition and reduce frizz without altering curl size.
- For straight or fine hair: add subtle density and reduced scalp visibility without creating unnatural thickness.
- Maintain natural hairline shape, hair texture and growth direction for all hair types.

Strict Rules:
- Do NOT change the person’s face, skin, features or expression.
- Do NOT modify background, clothing, accessories or lighting.
- Avoid unrealistic shine, smoothing or beauty filters.
- Preserve the original color, ethnic characteristics and texture of the hair.

Target Look:
- A natural, clinic-quality "after treatment" improvement that stays true to the person’s real hair.
`.trim()

};

/* -------------------------------------------------------
   GEMINI MODELS
------------------------------------------------------- */
async function generateWithGeminiModel(
  modelName: string,
  prompt: string,
  mimeType: string,
  base64Image: string,
  apiKey: string
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  if (!response.ok) {
    const details = await response.text();
    return { success: false as const, error: details || `HTTP ${response.status}` };
  }

  const geminiData = await response.json();
  const candidate = geminiData.candidates?.[0];

  if (!candidate) return { success: false as const, error: 'No candidates returned' };

  const parts = candidate.content?.parts || [];
  for (const part of parts) {
    if (part.inline_data?.data || part.inlineData?.data) {
      return { success: true, data: part.inline_data?.data || part.inlineData?.data };
    }
  }

  return { success: false as const, error: 'No inline image data in response' };
}

/* -------------------------------------------------------
   TEETH SHADE/STYLES
------------------------------------------------------- */
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
  AggressiveStyle: 'aggressive style with bold incisal edges',
  DominantStyle: 'dominant style with pronounced central incisors',
  EnhancedStyle: 'enhanced style with refined contours',
  FocusedStyle: 'focused style emphasizing symmetry',
  FunctionalStyle: 'functional style with practical contours',
  HollywoodStyle: 'Hollywood style full, glamorous veneers',
  MatureStyle: 'mature style with softened anatomy',
  NaturalStyle: 'natural style with gentle texture',
  OvalStyle: 'oval style with rounded corners',
  SoftenedStyle: 'softened style with subtle transitions',
  VigorousStyle: 'vigorous style with energetic shapes',
  YouthfulStyle: 'youthful style with playful curvature',
};

/* Auto validation keys */
const VALID_TEETH_SHADES = Object.keys(teethShadeDescriptions);
const VALID_TEETH_STYLES = Object.keys(teethStyleDescriptions);

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

const URL_REGEX = /^https?:\/\/.+/i;
const VALID_TREATMENT_TYPES = ['teeth', 'hair'];

const describeTeethShade = (value?: string) =>
  value ? teethShadeDescriptions[value] ?? value : undefined;

const describeTeethStyle = (value?: string) =>
  value ? teethStyleDescriptions[value] ?? value : undefined;

/* -------------------------------------------------------
   MAIN ROUTE HANDLER
------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, treatmentType, teethShade, teethStyle } = body;

    // Validate image
    if (!imageUrl || typeof imageUrl !== 'string') {
      return buildResponse({ error: 'Image URL is required' }, 400);
    }
    if (!URL_REGEX.test(imageUrl)) {
      return buildResponse({ error: 'Invalid image URL format' }, 400);
    }
    const allowedDomains = ['supabase.co', 'supabase.in'];
    const urlObj = new URL(imageUrl);
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
    if (!isAllowed) {
      return buildResponse({ error: 'Image URL must be from Supabase storage' }, 400);
    }

    // Treatment type
    if (!VALID_TREATMENT_TYPES.includes(treatmentType)) {
      return buildResponse({ error: 'Invalid treatment type. Must be "teeth" or "hair"' }, 400);
    }

    // Teeth validation
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
      return buildResponse({ error: 'No image generation API is configured' }, 500);
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return buildResponse({ error: 'Failed to fetch image' }, 400);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return buildResponse({ error: 'URL does not point to an image' }, 400);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return buildResponse({ error: 'Image too large (max 10MB)' }, 400);
    }

    const base64Image = imageBuffer.toString('base64');
    const mimeType = contentType;

    /* -------- Build Prompt -------- */
    let prompt = prompts[treatmentType];

    if (treatmentType === 'teeth') {
      const shadeDesc = describeTeethShade(teethShade);
      const styleDesc = describeTeethStyle(teethStyle);

      if (shadeDesc || styleDesc) {
        prompt += `\n\nApply the following specific settings:\n`;
      }
      if (shadeDesc) {
        prompt += `- Tooth shade: ${shadeDesc} (shade code: ${teethShade}).\n`;
      }
      if (styleDesc) {
        prompt += `- Tooth style: ${styleDesc} (style code: ${teethStyle}).\n`;
      }
      if (shadeDesc || styleDesc) {
        prompt += `\nEnsure the results remain natural and clinically realistic.\n`;
      }
    }

    /* -------- Generate With Gemini -------- */
    const attemptErrors: string[] = [];
    const geminiModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

    let transformedImageData: string | null = null;

    for (const modelName of geminiModels) {
      const result = await generateWithGeminiModel(
        modelName,
        prompt,
        mimeType,
        base64Image,
        geminiApiKey
      );

      if (result.success) {
        transformedImageData = result.data;
        console.log(`[transform-image] provider=gemini model=${modelName}`);
        break;
      }

      attemptErrors.push(`${modelName}: ${result.error}`);
    }

    if (!transformedImageData) {
      return buildResponse(
        { error: 'Failed to process image with Gemini API', details: attemptErrors.join(' | ') },
        500
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
