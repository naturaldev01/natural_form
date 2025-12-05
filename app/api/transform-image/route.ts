import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

interface ReferenceImage {
  mimeType: string;
  data: string;
}

const OPERATION_REFERENCE_FILES = [
  'BEFORE1.jpg',
  'BEFORE2.jpg',
  'BEFORE3.jpg',
  'BEFORE4.jpg',
  'OP1.jpg',
  'OP2.jpg',
  'OP3.jpg',
  'OP4.jpg',
  'AFTER1.jpg',
  'AFTER2.jpg',
  'AFTER3.jpg',
  'AFTER4.jpg',
];

let operationReferenceCache: Promise<ReferenceImage[]> | null = null;

async function getOperationReferenceImages(): Promise<ReferenceImage[]> {
  if (!operationReferenceCache) {
    operationReferenceCache = (async () => {
      try {
        const root = path.join(process.cwd(), 'public', 'assets', 'operations');
        const files = await Promise.all(
          OPERATION_REFERENCE_FILES.map(async (file) => {
            try {
              const filePath = path.join(root, file);
              const buffer = await fs.readFile(filePath);
              return {
                mimeType: 'image/jpeg',
                data: buffer.toString('base64'),
              } as ReferenceImage;
            } catch {
              return null;
            }
          })
        );
        return files.filter((img): img is ReferenceImage => Boolean(img));
      } catch {
        return [];
      }
    })();
  }
  return operationReferenceCache;
}

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

hair_base: 
`Role: Precision Image Editor & Hair Transplant Retoucher

Task:
Perform a strict "Inpainting" operation on the provided image. Your sole task is to FILL the balding/thinning areas with high-density hair.

CRITICAL CONSTRAINTS (Do Not Violate):
1. GEOMETRY LOCK: Do NOT rotate, tilt, re-angle, or reshape the head. The output pose must align pixel-perfectly with the input image.
2. FACIAL PRESERVATION: Do NOT touch the face, eyes, skin texture, or expression.
3. BACKGROUND LOCK: Do NOT alter the background pixels.

VISUAL INSTRUCTIONS:

1. DENSITY FILLING (The Goal):
   - Identify the scalp areas exposed due to thinning (the Norwood pattern).
   - OVERLAY dense hair texture onto these specific coordinates.
   - Create an OPAQUE CANOPY. The scalp skin must NOT be visible in the frontal or crown zones after filling.

2. COLOR ANCHORING (Crucial):
   - SOURCE: Sample the hair color EXACTLY from the subject's existing sideburns and temple hair.
   - APPLICATION: The new transplanted hair on top MUST match this dark tone 100%.
   - ANTI-AGING: Do NOT add grey or white hairs. Do NOT make the hair look older or ashier than the sides. The pigment must be deep and dark to absorb light and prevent shine.

3. HAIRLINE DEFINITION:
   - Reconstruct a defined, dense hairline following standard medical design principles appropriate for the face.

Output Requirement: The exact same photograph, same lighting, same angle, but with the balding areas completely filled with dark, dense hair matching the sides.`
.trim(),

hair_control: `ACT AS: Precision Retouching AI (Inpainting Focus).

OPERATION: Fill the sparse/bald zones using the SUBJECT'S EXISTING HEAD TOPOLOGY and COLOR.

INPUT DATA:
VIEW ANGLE: {{view_angle}} (Strictly maintain this angle. No re-imagining).
CURRENT NORWOOD: {{current_norwood}}
TARGET: Maximum Density Coverage.

INSTRUCTIONS:
1. MAPPING & FILL:
   - Map the thinning areas based on the current Norwood pattern.
   - Apply dense hair texture ONLY to these identified zones. ensure the scalp is completely hidden.

2. COLOR FORCE:
   - Force the new hair color to identical to the darkest part of the existing side hair.
   - Prohibit any desaturation or graying effects.

3. INTEGRATION:
   - Blend the new high-density top hair seamlessly with the existing side hair borders. The transition must be invisible.

NEGATIVE CONSTRAINTS:
- NO HEAD MOVE.
- NO POSE CHANGE.
- NO GREY HAIR GENERATION.
- NO SCALP SHINE VISIBILITY.
`.trim()

};

function buildHairControlPrompt() {
  const replacements: Record<string, string> = {
    '{{view_angle}}': 'frontal and vertex composite',
    '{{current_norwood}}': 'Norwood IV',
    '{{target_norwood}}': 'Norwood II',
    '{{hairline_plan.description}}':
      'Recreate a soft, natural-looking anterior hairline with micro irregularities. Maintain a gentle central peak and rounded temporal recessions.',
    '{{hairline_plan.frontal_band_thickness_cm}}': '2.0',
    '{{hairline_plan.temple_description}}':
      'Temple points should be reinforced but kept slightly softer than the frontal band for age-appropriate balance.',
    '{{density_plan.high_density_zones}}':
      'Frontal band (first 2cm), mid-scalp transition, and visible crown swirl',
    '{{density_plan.medium_density_zones}}':
      'Mid-scalp posterior area and upper parietal zones',
    '{{density_plan.low_density_zones}}':
      'Lateral humps and very posterior crown edges (maintain donor realism)',
    '{{density_plan.notes}}':
      'Ensure a gradual transition between densities to avoid any helmet look. Preserve the patient’s original hair texture, direction, and subtle greys.',
  };

  let prompt = prompts.hair_control;
  Object.entries(replacements).forEach(([token, value]) => {
    prompt = prompt.split(token).join(value);
  });
  return prompt;
}

/* -------------------------------------------------------
   GEMINI MODELS
------------------------------------------------------- */
async function generateWithGeminiModel(
  modelName: string,
  prompt: string,
  mimeType: string,
  base64Image: string,
  apiKey: string,
  options?: { temperature?: number; references?: ReferenceImage[] }
) {
  const temperature = options?.temperature ?? 0.2;
  const parts: any[] = [
    { text: prompt },
    {
      inline_data: {
        mime_type: mimeType,
        data: base64Image,
      },
    },
  ];

  if (options?.references?.length) {
    for (const ref of options.references) {
      parts.push({
        inline_data: {
          mime_type: ref.mimeType,
          data: ref.data,
        },
      });
    }
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature,
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

  const candidateParts = candidate.content?.parts || [];
  for (const part of candidateParts) {
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
    let referenceImages: ReferenceImage[] = [];
    if (treatmentType === 'teeth') {
      if (teethShade && !VALID_TEETH_SHADES.includes(teethShade)) {
        return buildResponse({ error: 'Invalid teeth shade value' }, 400);
      }
      if (teethStyle && !VALID_TEETH_STYLES.includes(teethStyle)) {
        return buildResponse({ error: 'Invalid teeth style value' }, 400);
      }
    } else {
      referenceImages = await getOperationReferenceImages();
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
    let prompt = '';

    if (treatmentType === 'teeth') {
      prompt = prompts.teeth;
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
    } else if (referenceImages.length) {
      // hair flow handles prompts separately, but we still keep base text for completeness
    }

    const geminiModels =
      treatmentType === 'hair'
        ? ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
        : ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

    const runWithModels = async (
      promptText: string,
      imageData: string,
      temperature: number,
      refs: ReferenceImage[]
    ) => {
      const attemptErrors: string[] = [];
      for (const modelName of geminiModels) {
        const result = await generateWithGeminiModel(
          modelName,
          promptText,
          mimeType,
          imageData,
          geminiApiKey,
          { temperature, references: refs }
        );

        if (result.success) {
          console.log(`[transform-image] provider=gemini model=${modelName}`);
          return result.data;
        }
        attemptErrors.push(`${modelName}: ${result.error}`);
      }
      throw new Error(attemptErrors.join(' | '));
    };

    const modelTemperature = treatmentType === 'hair' ? 0.65 : 0.4;
    let transformedImageData: string;

    if (treatmentType === 'hair') {
      const basePassPrompt = prompts.hair_base;
      let intermediateData: string;
      try {
        intermediateData = await runWithModels(basePassPrompt, base64Image, 0.55, referenceImages);
      } catch (error) {
        return buildResponse(
          {
            error: 'Failed to process image with Gemini API',
            details: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }

      const controlPrompt = buildHairControlPrompt();
      try {
        transformedImageData = await runWithModels(
          controlPrompt,
          intermediateData,
          modelTemperature,
          referenceImages
        );
      } catch (error) {
        return buildResponse(
          {
            error: 'Failed to process image with Gemini API',
            details: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    } else {
      try {
        transformedImageData = await runWithModels(
          prompt,
          base64Image,
          modelTemperature,
          referenceImages
        );
      } catch (error) {
        return buildResponse(
          {
            error: 'Failed to process image with Gemini API',
            details: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
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
