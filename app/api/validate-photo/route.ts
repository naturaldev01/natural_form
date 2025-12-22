import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const VALIDATION_PROMPT = `
You are a dental photo validator for a smile design AI tool.

Your task is to check if the photo is TECHNICALLY SUITABLE for AI teeth transformation.

=== MINIMUM REQUIREMENTS FOR A VALID PHOTO ===
1. FULL FACE visible - eyes, nose, and mouth must ALL be visible in the frame
2. TEETH visible - the person must be showing their teeth (smiling, grinning, or mouth open)
3. Frontal or near-frontal view (face towards camera)
4. Reasonably clear image (not extremely blurry)

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

3. NO TEETH VISIBLE
   - Mouth is closed
   - Lips cover teeth completely
   - Issue: "teeth not visible - please smile"

=== WHAT TO ACCEPT ===
Accept photos where:
- The full face is visible (eyes, nose, mouth)
- Teeth are showing (any type of smile is fine - doesn't need to be "natural")
- Photo is reasonably clear

DO NOT reject photos for:
- Unnatural or exaggerated smiles (these are fine for dental work)
- Slightly imperfect lighting
- Minor angle variations

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

