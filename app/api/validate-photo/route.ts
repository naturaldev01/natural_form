import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const VALIDATION_PROMPT = `
You are an EXTREMELY STRICT dental photo validator for a smile design AI tool.

Your task is to check if the photo is TECHNICALLY SUITABLE for AI teeth transformation.
Be VERY STRICT - we need PERFECT photos for accurate dental work simulation.
When in doubt, REJECT the photo.

=== CRITICAL: WHAT WE NEED ===
We need to see TEETH CLEARLY to do dental transformation. This means:
- Person must have a NATURAL SMILE showing teeth (not mouth wide open)
- Upper and lower teeth should be CLOSE TOGETHER or TOUCHING (natural bite position)
- We must be able to see INDIVIDUAL teeth clearly
- The teeth area must be LARGE enough in the photo (not a tiny distant figure)

=== MINIMUM REQUIREMENTS FOR A VALID PHOTO ===
1. FULL FACE visible - eyes, nose, and mouth must ALL be visible in the frame
2. NATURAL SMILE - teeth showing in a natural, relaxed smile position
3. TEETH IN NATURAL BITE - upper and lower teeth should be close together or touching (like a normal smile, not mouth wide open)
4. TEETH MUST BE VISIBLE - individual teeth should be distinguishable (at least 6-8 upper front teeth)
5. NO VISIBLE GAPS BETWEEN TEETH - teeth should appear naturally aligned without large diastema (gaps between teeth)
6. UPRIGHT position - person should be standing or sitting, NOT lying down
7. Frontal or near-frontal view (face looking straight at camera)
8. CLOSE ENOUGH - face must be large enough to see teeth details (not a distant full-body shot)

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

3. CLOSED-LIP SMILE OR MINIMAL TEETH (VERY IMPORTANT!)
   - Person is smiling but lips are CLOSED (no teeth showing)
   - Person is smiling but only a HINT of teeth visible
   - Lips are together or barely parted
   - Cannot count at least 6 individual front teeth
   - Only bottom teeth visible without upper teeth
   - Teeth are small/distant and not clearly distinguishable
   - Issue: "teeth not clearly visible - please show a natural smile with teeth visible"

4. MOUTH TOO WIDE OPEN (VERY IMPORTANT!)
   - Mouth is EXCESSIVELY open (like saying "ahhh" at dentist)
   - Upper and lower teeth are NOT touching or close together
   - There is a large gap between upper and lower teeth rows
   - Can see deep into the mouth/throat
   - This is NOT a natural smile position
   - Issue: "mouth too wide open - please show a natural smile where upper and lower teeth are close together"

5. VISIBLE GAPS BETWEEN TEETH (DIASTEMA)
   - There are visible gaps/spaces between front teeth
   - Teeth are not aligned properly with visible spacing
   - Large gap between two front teeth (central incisors)
   - Issue: "visible gaps between teeth detected - please provide a photo with naturally aligned teeth"

6. DISTANT/FULL BODY SHOT
   - Person is far from camera (full body or most of body visible)
   - Face is small in the frame
   - Cannot clearly see teeth details
   - Issue: "photo taken from too far - please take a closer photo of your face"

7. LYING DOWN POSITION
   - Person is lying on bed, couch, or floor
   - Photo taken from above while person is horizontal
   - Head is resting on pillow
   - Issue: "please take photo while standing or sitting upright"

8. WRONG ANGLE
   - Face turned significantly to the side (profile view)
   - Looking up or down instead of straight at camera
   - Tilted head that hides teeth
   - Issue: "please look straight at the camera"

9. POOR QUALITY
   - Extremely blurry or out of focus
   - Too dark to see teeth clearly
   - Issue: "photo quality too low - please take a clearer photo"

=== WHAT TO ACCEPT ===
Accept photos ONLY where ALL of these are true:
- The full face is visible (eyes, nose, mouth)
- Person has a NATURAL smile (not mouth wide open)
- Upper and lower teeth are close together or touching (natural bite)
- You can see at least 6 individual front teeth clearly
- Teeth appear naturally aligned WITHOUT large gaps between them
- Person is upright (standing or sitting)
- Face is looking straight at camera
- Face is close enough to see teeth details
- Photo is clear enough to see individual teeth

DO NOT reject photos for:
- Slightly imperfect lighting
- Minor angle variations (±15 degrees is OK)
- Teeth that are slightly crooked (this is what we're fixing!)
- Teeth that are slightly discolored (this is what we're fixing!)

=== IMPORTANT REMINDER ===
A "smile" is NOT enough. We need TEETH VISIBLE in NATURAL POSITION.
- If lips are together or barely parted = REJECT
- If mouth is too wide open (teeth not in bite position) = REJECT
- If there are visible gaps between front teeth = REJECT
- If teeth are visible but too small/distant to work on = REJECT

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

    // Apply threshold - if confidence is below 75%, consider it invalid
    const CONFIDENCE_THRESHOLD = 0.75;
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

