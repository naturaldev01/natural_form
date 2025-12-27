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
We need to see teeth clearly, but be REASONABLE - don't reject good photos for minor issues.

=== WHAT WE NEED ===
We need to see TEETH CLEARLY to do dental transformation. This means:
- Person showing teeth in a smile (can be wide/exaggerated smile - that's fine!)
- We must be able to see the FRONT TEETH clearly
- Upper teeth must be visible (lower teeth visibility is a bonus, not required)
- The face/teeth area must be LARGE enough in the photo

=== MINIMUM REQUIREMENTS FOR A VALID PHOTO ===
1. FULL FACE visible - eyes, nose, and mouth must ALL be visible in the frame
2. TEETH SHOWING - front teeth must be clearly visible (at least 6 upper front teeth)
3. UPRIGHT position - person should be standing or sitting, NOT lying down
4. Frontal or near-frontal view (face looking toward camera)
5. CLOSE ENOUGH - face must be large enough to see teeth details

=== AUTOMATIC REJECTION (isValid: false) ===
REJECT the photo ONLY if ANY of these SERIOUS issues are true:

1. CLOSE-UP OF MOUTH ONLY
   - Photo shows ONLY mouth/teeth/lips area without full face
   - The person's EYES are NOT visible in the photo
   - Issue: "close-up of mouth only - need full face photo"

2. NO EYES VISIBLE
   - The frame cuts off above the nose
   - Cannot see the person's eyes
   - Issue: "eyes not visible - need full face photo"

3. CLOSED-LIP SMILE OR NO TEETH
   - Person is smiling but lips are CLOSED (no teeth showing)
   - Person is smiling but only a tiny hint of teeth visible
   - Cannot see any individual front teeth
   - Issue: "teeth not visible - please show a smile with teeth"

4. DISTANT/FULL BODY SHOT
   - Person is far from camera (full body or most of body visible)
   - Face is small in the frame
   - Cannot clearly see teeth details
   - Issue: "photo taken from too far - please take a closer photo"

5. LYING DOWN POSITION
   - Person is clearly lying on bed, couch, or floor
   - Photo taken from above while person is horizontal
   - Issue: "please take photo while standing or sitting upright"

6. WRONG ANGLE (SEVERE)
   - Face turned significantly to the side (profile view, >45 degrees)
   - Cannot see both eyes
   - Issue: "please look straight at the camera"

7. VERY POOR QUALITY
   - Extremely blurry or out of focus (cannot distinguish individual teeth)
   - Too dark to see teeth at all
   - Issue: "photo quality too low - please take a clearer photo"

=== WHAT TO ACCEPT (IMPORTANT!) ===
ACCEPT photos where:
- Full face is visible (eyes, nose, mouth)
- Front teeth are clearly visible (even if mouth is wide open!)
- Person is upright and facing camera
- Photo is clear enough to see individual teeth

=== DO NOT REJECT FOR THESE (VERY IMPORTANT!) ===
- Wide open mouth / exaggerated smile - THIS IS FINE! We just need to see teeth.
- Upper and lower teeth not touching - THIS IS FINE! As long as we see teeth clearly.
- Teeth with natural small gaps - THIS IS FINE! Small gaps between teeth are normal.
- Crooked, discolored, or imperfect teeth - THIS IS FINE! This is what we're fixing!
- Slightly imperfect lighting
- Minor angle variations (up to ±30 degrees is OK)
- Intense/exaggerated facial expressions - THIS IS FINE if teeth are visible!

=== KEY POINT ===
If you can clearly see the person's face AND their front teeth, the photo is probably VALID.
Don't be overly strict. We want to help people, not reject them for minor issues.

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

    // Apply threshold - if confidence is below 65%, consider it invalid
    const CONFIDENCE_THRESHOLD = 0.65;
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

