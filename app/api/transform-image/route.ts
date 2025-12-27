import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
  teeth_base: `
You are a professional dental imaging AI for a premium smile design clinic.
Transform the teeth in this photo to show a realistic "after treatment" result.

BASE TRANSFORMATION GOALS:
- Make teeth straight, well-aligned, and naturally shaped
- Improve symmetry and surface quality
- Keep natural enamel texture and realistic appearance
- Result should look like professional dental work, not artificial

=== CRITICAL TOOTH STRUCTURE RULES ===
1. TEETH MUST TOUCH - Adjacent teeth must be in contact with each other. NO gaps between teeth.
2. NO BROKEN TEETH - All teeth must appear complete and undamaged. Fix any chipped or broken appearance.
3. SMOOTH EDGES - Incisal edges should be smooth and even, not jagged or irregular.
4. NATURAL ALIGNMENT - Teeth should follow a natural dental arch curve.
5. PROPER PROPORTIONS - Central incisors slightly larger, laterals slightly smaller, canines properly shaped.

=== ABSOLUTELY FORBIDDEN ===
- DO NOT create gaps/spaces between teeth (diastema)
- DO NOT make teeth appear broken, chipped, or damaged
- DO NOT leave jagged or uneven edges
- DO NOT create unnaturally wide spaces
- DO NOT make teeth look artificial or plastic

STRICT PRESERVATION RULES:
- Do NOT change the person's face, lips, eyes, skin tone, or expression
- Do NOT change the mouth position or smile width  
- Do NOT modify hair, background, clothing, or lighting
- Keep the same person - no face replacement

OUTPUT: Same photo with only teeth transformed - teeth must be touching, complete, and natural-looking.
`.trim(),

  teeth_with_specs: `
You are a professional dental imaging AI for a premium smile design clinic.
Your task is to transform teeth according to EXACT clinical specifications.

=== MANDATORY SPECIFICATIONS ===
{{SHADE_SPEC}}
{{STYLE_SPEC}}

=== CRITICAL INSTRUCTIONS ===
The shade and style above are MANDATORY requirements from the patient's consultation.
You MUST visibly apply these specifications. The output teeth MUST clearly show:
1. The exact color/shade requested (compare to dental shade guide)
2. The exact shape/style requested (visible tooth contour changes)

If the requested shade is bright (0M1, 0M2, 0M3, A1, B1), the teeth MUST appear noticeably whiter than the original.
If a Hollywood or aggressive style is requested, the teeth shape MUST show visible enhancement.

=== CRITICAL TOOTH STRUCTURE RULES ===
1. TEETH MUST TOUCH - Adjacent teeth MUST be in contact with each other. NO gaps between teeth allowed.
2. NO BROKEN TEETH - All teeth must appear complete and undamaged. Fix any chipped or broken appearance.
3. SMOOTH EDGES - Incisal edges should be smooth and even, not jagged or irregular.
4. NATURAL ALIGNMENT - Teeth should follow a natural dental arch curve.
5. PROPER PROPORTIONS - Central incisors slightly larger, laterals slightly smaller, canines properly shaped.
6. APPLY THE STYLE - The requested style (Hollywood, Aggressive, etc.) MUST be visible in the tooth shape.
7. APPLY THE SHADE - The requested color MUST be clearly applied to all visible teeth.

=== ABSOLUTELY FORBIDDEN ===
- DO NOT create gaps/spaces between teeth (diastema) - teeth must touch
- DO NOT make teeth appear broken, chipped, or damaged
- DO NOT leave jagged or uneven edges
- DO NOT create unnaturally wide spaces between teeth
- DO NOT make teeth look artificial or plastic
- DO NOT just whiten without applying the requested style
- DO NOT ignore the shade - color change must be visible

=== TRANSFORMATION GOALS ===
- Make teeth straight, well-aligned, and naturally shaped
- Apply the EXACT shade color specified above (MANDATORY)
- Apply the EXACT style/shape specified above (MANDATORY)
- Ensure all teeth are touching - no gaps
- Keep natural enamel texture while achieving the requested look

=== STRICT PRESERVATION RULES ===
- Do NOT change the person's face, lips, eyes, skin tone, or expression
- Do NOT change the mouth position or smile width
- Do NOT modify hair, background, clothing, or lighting

=== QUALITY CHECK ===
Before outputting, verify:
- Does the tooth color match the requested shade? (MANDATORY)
- Does the tooth shape match the requested style? (MANDATORY)
- Are all adjacent teeth touching with no gaps? (MANDATORY)
- Are all teeth complete with no broken/chipped appearance? (MANDATORY)
- Is the result realistic and natural-looking? (REQUIRED)

OUTPUT: Same photo with teeth transformed to EXACTLY match the requested shade and style - teeth must be touching, complete, and properly styled.
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
- If lighting hides scalp, infer miniaturization from asymmetry/temporal recession and frontal band thinning; do not assume zero loss.
- Always assess temple corners and frontal midline for miniaturization; treat visible or suspected miniaturization as a fill target.
- If loss is minimal but present, reinforce temples and frontal band with micro-irregular Norwood II contour; never lower below ≤1–1.5 cm above lateral brow.
- Maintain left/right symmetry of the hairline and density within natural tolerance (no overfilling one temple relative to the other).

FUE-STYLE DENSITY & DISTRIBUTION:
- Treat new hair as FUE grafts placed one by one.
- Rebuild density (55–80 FU/cm² equivalent) in the frontal band; taper naturally to mid-scalp/crown.
- Maintain donor realism: subtle density transitions, no artificial bulk.

HAIR FILLING:
- Fill ONLY the bald/thinning scalp areas.
- DO NOT modify or densify existing native hair on the sides or covered zones, except seamless blending.
- Eliminate scalp visibility in reconstructed zones without crossing onto forehead skin.
- If scalp loss is minimal, leave hair unchanged; no densification of native hair.

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
If scalp loss is minimal, return unchanged; do NOT densify native hair.
If scalp loss is minimal but present, reinforce miniaturized temple corners and frontal band; do NOT lower onto forehead skin.

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
   - Leave existing hair untouched except seamless blend; do NOT thicken native hair shafts globally.
   - Detect and fill miniaturized zones even if scalp is partially camouflaged by lighting; prioritize temples and frontal band gaps.
   - Add grafts only where scalp or miniaturization is detected (frontal band ~2 cm, crown swirl if open).
   - Fill visible scalp with dense, natural strands; no transparency or patchiness.
   - Avoid helmet walls; keep temporal recess harmony; taper density away from frontal band and temple recesses.
   - Balance density left/right; avoid asymmetry beyond natural micro-irregularities.

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
- NO darkening or brightening of hair globally.
- NO volume addition to lateral/sides; no bulk increase of existing hair.

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
  let combined = `${prompts.hair_base}\n\n${prompt}\n\nHard limits:\n- Never place hair on intact forehead skin.\n- Never lower the hairline below mid-forehead proportion or ≤1–1.5 cm above lateral brow.\n- Do not increase density on areas already covered with strong native hair.\n- Add grafts only where scalp or miniaturization is visible/suspected; no helmet-density walls; preserve temporal recess harmony.\n- Maintain left/right symmetry of hairline and density within natural tolerance.`;
  if (analysisText?.trim()) {
    combined += `\n\nClinical analysis notes:\n${analysisText.trim()}\n\nExecute the transformation so that it fulfills the formal plan above, the hard limits, and the specialist analysis exactly.`;
  } else {
    combined += `\n\nFallback plan:\n- Use conservative Norwood II outline; keep temporal points open; fill only visible or suspected miniaturized scalp loss (frontal band ~2 cm, crown swirl if exposed).\n- If loss < Norwood II or scalp not visible, return unchanged (no densification).`;
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

/**
 * Lightweight visual check (Gemini) to see if teeth actually changed.
 * Returns true if Gemini says "yes", otherwise false. Fails open (true) on errors.
 */
async function detectTeethChangeGemini(params: {
  beforeBase64: string;
  afterBase64: string;
  beforeMime: string;
  afterMime: string;
  geminiApiKey: string;
  shadeDesc?: string;
  styleDesc?: string;
  shadeCode?: string;
  styleCode?: string;
}): Promise<boolean> {
  const { beforeBase64, afterBase64, beforeMime, afterMime, geminiApiKey, shadeDesc, styleDesc, shadeCode, styleCode } =
    params;

  if (!geminiApiKey) return true;

  // Build specific expectations based on what was requested
  const expectations: string[] = [];
  
  if (shadeDesc && shadeCode) {
    expectations.push(`SHADE CHECK: The teeth should now match "${shadeDesc}" (code: ${shadeCode}).`);
    // Add specific brightness expectations for common shades
    if (['0M1', '0M2', '0M3', 'A1', 'B1'].includes(shadeCode)) {
      expectations.push('- These are BRIGHT shades. Teeth should appear noticeably WHITER than the original.');
    }
  }
  
  if (styleDesc && styleCode) {
    expectations.push(`STYLE CHECK: The teeth shape should reflect "${styleDesc}" (code: ${styleCode}).`);
    if (['HollywoodStyle', 'AggressiveStyle', 'DominantStyle'].includes(styleCode)) {
      expectations.push('- This is a PRONOUNCED style. Tooth shape should show visible enhancement.');
    }
  }

  const prompt = [
    'You are a STRICT dental transformation QA checker.',
    '',
    'TASK: Compare BEFORE and AFTER images to verify the transformation was successful.',
    '',
    expectations.length > 0 ? 'EXPECTED CHANGES:' : 'EXPECTED: General teeth whitening/enhancement.',
    ...expectations,
    '',
    'VERIFICATION CRITERIA:',
    '1. Is there a VISIBLE difference in tooth color between BEFORE and AFTER?',
    '2. Is there a VISIBLE difference in tooth shape between BEFORE and AFTER?',
    '3. Do the AFTER teeth appear to match the requested specifications?',
    '',
    'Answer "yes" ONLY if:',
    '- There is a clear, noticeable change in the teeth',
    '- The change appears to match the requested shade/style',
    '',
    'Answer "no" if:',
    '- The teeth look the same as before',
    '- The change is too subtle to notice',
    '- The requested shade/style was not applied',
    '',
    'Response: Answer with ONLY "yes" or "no" (lowercase, no explanation).',
  ].join('\n');

  const parts: any[] = [
    { text: prompt },
    { text: 'BEFORE image:' },
    {
      inline_data: {
        mime_type: beforeMime,
        data: beforeBase64,
      },
    },
    { text: 'AFTER image:' },
    {
      inline_data: {
        mime_type: afterMime,
        data: afterBase64,
      },
    },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, maxOutputTokens: 8 },
        }),
      }
    );

    if (!response.ok) return true;

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join(' ').toLowerCase() ||
      '';

    if (text.includes('yes')) return true;
    if (text.includes('no')) return false;
    return true; // ambiguous -> fail open
  } catch (error) {
    console.warn('[transform-image] teeth change detection failed (gemini)', error);
    return true; // fail open
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

function imagesAreIdentical(beforeBase64: string, afterBase64: string) {
  if (beforeBase64 === afterBase64) return true;
  if (!beforeBase64 || !afterBase64) return false;
  const beforeHash = crypto.createHash('sha256').update(beforeBase64).digest('hex');
  const afterHash = crypto.createHash('sha256').update(afterBase64).digest('hex');
  return beforeHash === afterHash;
}

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
      const shadeDesc = describeTeethShade(teethShade);
      const styleDesc = describeTeethStyle(teethStyle);

      // Use specialized prompt if shade or style is specified
      if (shadeDesc || styleDesc) {
        prompt = prompts.teeth_with_specs;
        
        // Build shade specification
        const shadeSpec = shadeDesc 
          ? `SHADE: ${shadeDesc.toUpperCase()} (Code: ${teethShade})
   - This is a MANDATORY color requirement
   - The teeth MUST be transformed to match this exact shade
   - Compare result to dental Vita shade guide`
          : 'SHADE: Natural whitening (improve current shade naturally)';
        
        // Build style specification  
        const styleSpec = styleDesc
          ? `STYLE: ${styleDesc.toUpperCase()} (Code: ${teethStyle})
   - This is a MANDATORY shape requirement
   - The teeth contours MUST reflect this style
   - Apply visible shape enhancement matching this style`
          : 'STYLE: Natural enhancement (improve alignment and symmetry)';
        
        prompt = prompt
          .replace('{{SHADE_SPEC}}', shadeSpec)
          .replace('{{STYLE_SPEC}}', styleSpec);
          
        console.log(`[transform-image] Using teeth_with_specs prompt. Shade: ${teethShade}, Style: ${teethStyle}`);
      } else {
        // No specific shade/style - use base prompt
        prompt = prompts.teeth_base;
        console.log('[transform-image] Using teeth_base prompt (no shade/style specified)');
      }
    }

    const geminiModelsDefault =
      treatmentType === 'hair'
        ? ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
        : ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

    const runWithModels = async (
      promptText: string,
      imageData: string,
      imageMime: string,
      temperature: number,
      models: string[] = geminiModelsDefault
    ) => {
      const attemptErrors: string[] = [];
      for (const modelName of models) {
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

    const modelTemperature = 0.3;
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

      // Teeth QA: check if teeth visibly changed; if not, run a boosted pass.
      const shadeDesc = describeTeethShade(teethShade);
      const styleDesc = describeTeethStyle(teethStyle);
      const identicalOutput = imagesAreIdentical(base64Image, transformedImageData);

      const teethChanged = await detectTeethChangeGemini({
        beforeBase64: base64Image,
        afterBase64: transformedImageData,
        beforeMime: mimeType,
        afterMime: 'image/png',
        geminiApiKey,
        shadeDesc,
        styleDesc,
        shadeCode: teethShade,
        styleCode: teethStyle,
      });

      const needsRetry = identicalOutput || !teethChanged;
      
      if (needsRetry) {
        console.log(`[transform-image] QA failed - teeth change not detected. Retrying with boosted prompt...`);
      }

      if (needsRetry) {
        // Build a more aggressive boosted prompt
        const boostedPrompt = `
CRITICAL RETRY - Previous attempt failed QA check.

You MUST transform the teeth in this image. This is a MANDATORY requirement.

${shadeDesc ? `REQUIRED SHADE: ${shadeDesc.toUpperCase()} (Code: ${teethShade})
- The teeth MUST be visibly changed to this shade
- This shade should be CLEARLY DIFFERENT from the original
- Apply this color to ALL visible teeth uniformly` : ''}

${styleDesc ? `REQUIRED STYLE: ${styleDesc.toUpperCase()} (Code: ${teethStyle})
- The tooth shape MUST reflect this style
- The contours should be visibly enhanced
- This is NOT optional - the style must be clearly visible` : ''}

=== CRITICAL TOOTH STRUCTURE RULES ===
1. TEETH MUST TOUCH - Adjacent teeth MUST be in contact. NO gaps between teeth.
2. NO BROKEN TEETH - All teeth must appear complete and undamaged.
3. SMOOTH EDGES - Incisal edges must be smooth and even.
4. APPLY BOTH SHADE AND STYLE - Do NOT just whiten, you must apply the requested style shape too.

=== ABSOLUTELY FORBIDDEN ===
- NO gaps between teeth (diastema)
- NO broken or chipped teeth
- NO jagged edges
- NO ignoring the style (you must reshape, not just whiten)
- NO plastic/artificial appearance

IMPORTANT:
- The previous attempt did NOT make visible changes - you MUST do better
- Apply MORE noticeable whitening/reshaping than a conservative approach
- The change must be obvious when comparing before/after
- BOTH shade AND style must be applied - not just one
- Teeth must be touching each other with no gaps
- Still maintain realistic, natural-looking results (no glowing/plastic teeth)

STRICT RULES:
- Do NOT change face, lips, eyes, skin, expression
- Do NOT change hair, background, clothing, lighting
- ONLY transform the teeth

OUTPUT: Same photo with teeth CLEARLY transformed - proper shade, proper style, teeth touching, no gaps, no broken teeth.
`.trim();

        const boostedModels = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
        try {
          const boostedImage = await runWithModels(
            boostedPrompt,
            base64Image,
            mimeType,
            0.55,
            boostedModels
          );
          const stillIdentical = imagesAreIdentical(base64Image, boostedImage);
          if (!stillIdentical) {
            transformedImageData = boostedImage;
          } else {
            console.warn('[transform-image] boosted teeth attempt still identical to input');
            return buildResponse(
              {
                error:
                  'The AI could not safely change the teeth. Please try another photo or adjust selections.',
              },
              502
            );
          }
        } catch (error) {
          // if retry fails, keep first result but report
          console.warn('[transform-image] teeth retry failed', error);
        }
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
