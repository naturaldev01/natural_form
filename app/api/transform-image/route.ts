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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

hair_base: `
Role: Natural Clinic Hair Transplant Doctor (Identity-Locked)

Clinical context:
Simulate the 10–12 month POST-OP RESULT of a modern high-density FUE hair transplant.
Image must stay pixel-aligned with the input; no re-rendering, no surgery marks.

MANDATORY IDENTITY LOCK:
- The subject’s face and skull: ZERO CHANGE (skin, eyebrows, eyes, nose, mouth, jawline, ears, facial hair, expression).

MANDATORY IMAGE LOCK:
- Do NOT alter background, lighting, shadows, angle, pose, clothing, or camera geometry.

HAIRLINE & PROPORTION RULES:
- Respect age-appropriate anatomy; avoid straight juvenile lines.
- Keep the anterior hairline within ≤1–1.5 cm above the lateral brow line and never below the mid-forehead proportion.
- Do NOT cover intact forehead skin; fill only true scalp loss zones.
- Preserve temporal angles; no “helmet” wall of hair.

FUE-STYLE DENSITY & DISTRIBUTION:
- Treat new hair as FUE grafts placed one by one.
- Rebuild density (55–80 FU/cm² equivalent) in the frontal band; taper naturally to mid-scalp/crown.
- Maintain donor realism: subtle density transitions, no artificial bulk.

HAIR FILLING:
- Fill ONLY the bald/thinning scalp areas.
- DO NOT modify existing hair on the sides except for seamless blending.
- Eliminate scalp visibility in reconstructed zones without crossing onto forehead skin.

COLOR & TEXTURE LOCK:
- Sample color ONLY from existing side hair; no tone shift, no greying, no brightening.
- Match texture/curl/micro-waves to the subject’s original pattern.

STRICT PROHIBITIONS:
- NO face alteration (even 1 pixel). NO reshaping the head. NO adjusting forehead size.
- NO smoothing skin. NO beautification. NO style transfer. NO cartoon lines.
- NO replacement of the person with another person.

OUTPUT:
Return the SAME PERSON, SAME FACE, SAME PHOTO — only with balding areas naturally reconstructed with an anatomically correct FUE-style hairline and density.
`.trim(),

hair_control: `
Natural Clinic Hair Transplant Doctor — Identity Locked Mode

OPERATION OBJECTIVE:
Add hair ONLY to bald/thinning scalp zones. Nothing else changes.

SAFETY GUARD:
If uncertain, default to a conservative Norwood II profile; do NOT lower the forehead or temporal points.

INPUT:
VIEW ANGLE: {{view_angle}}
CURRENT NORWOOD: {{current_norwood}}
TARGET: Natural, dense coverage (Norwood 1 equivalent)

INSTRUCTIONS:

1. HAIRLINE ANALYSIS:
   - Detect actual recession zones (temporal peaks, corners).
   - Maintain age/ethnic-appropriate curve; avoid straight juvenile lines.
   - Reconstruct only the missing portions — never cross onto forehead skin.

2. FILL ONLY BALD AREAS:
   - Leave existing hair untouched except seamless blend.
   - Fill visible scalp with dense, natural strands; no transparency or patchiness.
   - Avoid helmet walls; keep temporal recess harmony.

3. COLOR MATCH:
   - Use ONLY the darkest tone of side hair.
   - Absolutely NO tone shift.

4. TEXTURE MATCH:
   - Match thickness, direction, micro-waves, and crown swirl.

5. INTEGRATION:
   - Blend borders invisibly.
   - Do NOT add extra volume outside thinning zones.

NEGATIVE CONSTRAINTS:
- NO face change.
- NO new skin texture.
- NO reshaping head contours.
- NO background modification.
- NO re-interpretation of lighting.
- NO beautification filter.

`.trim()

};

function buildHairControlPrompt(analysisText?: string) {
  const replacements: Record<string, string> = {
    '{{view_angle}}': 'frontal and vertex composite',
    '{{current_norwood}}': 'Norwood IV',
    '{{target_norwood}}': 'Norwood II',
    '{{hairline_plan.description}}':
      'Recreate a conservative, age-appropriate anterior hairline with micro irregularities; keep within ≤1–1.5 cm above lateral brow line.',
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
  let combined = `${prompts.hair_base}\n\n${prompt}\n\nHard limits:\n- Never place hair on intact forehead skin.\n- Never lower the hairline below mid-forehead proportion.\n- Absolutely no helmet-density walls; preserve temporal recess harmony.`;
  if (analysisText?.trim()) {
    combined += `\n\nClinical analysis notes:\n${analysisText.trim()}\n\nExecute the transformation so that it fulfills the formal plan above, the hard limits, and the specialist analysis exactly.`;
  } else {
    combined += `\n\nFallback plan:\n- Use conservative Norwood II outline; keep temporal points open; fill only visible scalp loss.`;
  }
  return combined;
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
  options?: { temperature?: number }
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

async function generateHairPlanDescription(base64Image: string, mimeType: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content:
              'You are a senior Natural Clinic hair transplant specialist. Provide detailed analyses of balding patterns and transplant plans in Turkish. Your notes should be clinical, structured, and ready to be used as instructions for an imaging model.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Fotoğraftaki hastanın kellik bölgelerini ve hangi bölgede nasıl bir transplant planı gerektiğini ayrıntılı ve madde madde açıkla. Klasik saç ekim terminolojisini kullan.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to get analysis from OpenAI');
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty analysis');
    }
    if (Array.isArray(content)) {
      return content.map((c: any) => c.text ?? '').join('\n').trim();
    }
    return String(content).trim();
  } catch (error) {
    throw new Error(
      `OpenAI hair analysis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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
    let planAnalysis: string | undefined;
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

    if (treatmentType === 'hair') {
      try {
        planAnalysis = await generateHairPlanDescription(base64Image, mimeType);
        console.log('[transform-image] OpenAI hair analysis:', planAnalysis);
      } catch (error) {
        return buildResponse(
          {
            error: 'Unable to analyze hair regions with OpenAI',
            details: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    }

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
    }

    const geminiModels =
      treatmentType === 'hair'
        ? ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
        : ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

    const runWithModels = async (
      promptText: string,
      imageData: string,
      imageMime: string,
      temperature: number
    ) => {
      const attemptErrors: string[] = [];
      for (const modelName of geminiModels) {
        const result = await generateWithGeminiModel(
          modelName,
          promptText,
          imageMime,
          imageData,
          geminiApiKey,
          { temperature }
        );

        if (result.success) {
          console.log(`[transform-image] provider=gemini model=${modelName}`);
          return result.data;
        }
        attemptErrors.push(`${modelName}: ${result.error}`);
      }
      throw new Error(attemptErrors.join(' | '));
    };

    const modelTemperature = 0.4;
    let transformedImageData: string;

    if (treatmentType === 'hair') {
      const controlPrompt = buildHairControlPrompt(planAnalysis);
      try {
        transformedImageData = await runWithModels(
          controlPrompt,
          base64Image,
          mimeType,
          modelTemperature
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
          mimeType,
          modelTemperature
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
    console.error('[transform-image] Unexpected error', error);
    return buildResponse(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
