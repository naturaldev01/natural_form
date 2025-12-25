import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const VALIDATION_PROMPT = `
You are a STRICT dental photo validator for a smile design AI tool.

Your task is to check if the photo is TECHNICALLY SUITABLE for AI teeth transformation.
Be STRICT - we need HIGH QUALITY photos for accurate dental work simulation.

=== MINIMUM REQUIREMENTS FOR A VALID PHOTO ===
1. FULL FACE visible - eyes, nose, and mouth must ALL be visible in the frame
2. SUFFICIENT TEETH visible - BOTH upper AND lower teeth must be clearly visible
3. UPRIGHT position - person should be standing or sitting, NOT lying down
4. Frontal or near-frontal view (face looking straight at camera)
5. Reasonably clear image (not blurry)
6. WIDE SMILE - teeth must be fully exposed, not partially hidden

=== AUTOMATIC REJECTION (isValid: false, confidence: 0) ===
REJECT the photo immediately if ANY of these are true:

1. CLOSE-UP OF MOUTH ONLY
   - Photo shows ONLY mouth/teeth/lips area
   - The person's EYES are NOT visible in the photo
   - Issue: "close-up of mouth only - need full face photo"

2. NO EYES VISIBLE
   - The frame cuts off above the nose
   - Cannot see the person's eyes
   - Issue: "eyes not visible - need full face photo"

3. INSUFFICIENT TEETH VISIBLE
   - Mouth is closed or barely open
   - Only upper teeth visible (lower teeth hidden)
   - Only lower teeth visible (upper teeth hidden)
   - Teeth partially covered by lips
   - Less than 6 teeth visible in total
   - Issue: "insufficient teeth visible - please show a wide smile with both upper and lower teeth"

4. LYING DOWN POSITION
   - Person is lying on bed, couch, or floor
   - Photo taken from above while person is horizontal
   - Head is resting on pillow
   - Issue: "please take photo while standing or sitting upright"

5. WRONG ANGLE
   - Face turned significantly to the side (profile view)
   - Looking up or down instead of straight at camera
   - Tilted head that hides teeth
   - Issue: "please look straight at the camera"

6. POOR QUALITY
   - Extremely blurry or out of focus
   - Too dark to see teeth clearly
   - Issue: "photo quality too low - please take a clearer photo"

=== WHAT TO ACCEPT ===
Accept photos ONLY where:
- The full face is visible (eyes, nose, mouth)
- BOTH upper AND lower teeth are clearly showing (wide smile)
- Person is upright (standing or sitting)
- Face is looking straight at camera
- Photo is clear enough to see individual teeth

DO NOT reject photos for:
- Unnatural or exaggerated smiles (these are fine for dental work)
- Slightly imperfect lighting
- Minor angle variations (±15 degrees is OK)

Analyze the photo and respond ONLY with a JSON object:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "issues": ["list", "of", "issues"] // empty array if valid
}
`;

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

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  issues: string[];
}

async function validatePhotoWithGemini(
  base64Image: string,
  mimeType: string
): Promise<ValidationResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: VALIDATION_PROMPT },
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
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const textContent = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || '')
    .join('')
    .trim();

  if (!textContent) {
    throw new Error('Empty response from Gemini');
  }

  // Extract JSON from response (it might be wrapped in markdown code blocks)
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse validation response');
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as ValidationResult;
    return {
      isValid: Boolean(result.isValid),
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      reason: result.reason || 'Unknown',
      issues: Array.isArray(result.issues) ? result.issues : [],
    };
  } catch {
    throw new Error('Invalid JSON in validation response');
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageData, mimeType } = body;

    if (!imageData || typeof imageData !== 'string') {
      return buildResponse({ error: 'Image data is required' }, 400);
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return buildResponse({ error: 'MIME type is required' }, 400);
    }

    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

    const validationResult = await validatePhotoWithGemini(base64Image, mimeType);

    // Apply threshold - if confidence is below 70%, consider it invalid
    const CONFIDENCE_THRESHOLD = 0.70;
    const isAcceptable = validationResult.isValid && validationResult.confidence >= CONFIDENCE_THRESHOLD;

    return buildResponse({
      isValid: isAcceptable,
      confidence: validationResult.confidence,
      reason: validationResult.reason,
      issues: validationResult.issues,
      threshold: CONFIDENCE_THRESHOLD,
    });
  } catch (error) {
    console.error('[validate-photo] Error:', error);
    return buildResponse(
      {
        error: 'Failed to validate photo',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

