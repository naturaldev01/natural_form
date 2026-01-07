import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const TEETH_VALIDATION_PROMPT = `
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

const HAIR_VALIDATION_PROMPT = `
You are a hair transplant photo validator for a hair restoration AI simulation tool.

Your task is to check if the photo is TECHNICALLY SUITABLE for AI hair transformation.
We need to see the hairline and scalp area clearly, but be REASONABLE - don't reject good photos for minor issues.

=== WHAT WE NEED ===
We need to see the HAIR/HAIRLINE AREA CLEARLY to do hair transformation. This means:
- Person's face visible with forehead/hairline area showing
- We must be able to see the FRONTAL HAIRLINE clearly
- The scalp/hair area must be visible (no hats, caps, or head coverings)
- The face/head area must be LARGE enough in the photo

=== MINIMUM REQUIREMENTS FOR A VALID PHOTO ===
1. FULL FACE visible - eyes, nose, and forehead must ALL be visible in the frame
2. HAIRLINE VISIBLE - frontal hairline must be clearly visible (forehead not covered)
3. NO HEAD COVERING - no hats, caps, scarves, or anything covering the head
4. UPRIGHT position - person should be standing or sitting, NOT lying down
5. Frontal or near-frontal view (face looking toward camera)
6. CLOSE ENOUGH - face must be large enough to see hairline details

=== AUTOMATIC REJECTION (isValid: false) ===
REJECT the photo ONLY if ANY of these SERIOUS issues are true:

1. HEAD COVERING
   - Person is wearing a hat, cap, beanie, turban, scarf, or any head covering
   - Cannot see the natural hairline
   - Issue: "head covering detected - please remove hat or cap"

2. FOREHEAD NOT VISIBLE
   - Forehead is cut off by the frame
   - Hair styled to completely cover forehead (bangs covering entire forehead)
   - Issue: "forehead not visible - please show your hairline"

3. NO FACE VISIBLE
   - Photo shows only the back or top of head
   - Cannot see the person's face
   - Issue: "face not visible - need frontal photo"

4. CLOSE-UP OF SCALP ONLY
   - Photo shows ONLY scalp/hair without face
   - The person's EYES are NOT visible in the photo
   - Issue: "need full face photo with hairline visible"

5. DISTANT/FULL BODY SHOT
   - Person is far from camera (full body or most of body visible)
   - Face is small in the frame
   - Cannot clearly see hairline details
   - Issue: "photo taken from too far - please take a closer photo"

6. LYING DOWN POSITION
   - Person is clearly lying on bed, couch, or floor
   - Photo taken from above while person is horizontal
   - Issue: "please take photo while standing or sitting upright"

7. WRONG ANGLE (SEVERE)
   - Face turned significantly to the side (profile view, >45 degrees)
   - Cannot see both eyes
   - Issue: "please look straight at the camera"

8. VERY POOR QUALITY
   - Extremely blurry or out of focus (cannot distinguish hairline)
   - Too dark to see hair/scalp area
   - Issue: "photo quality too low - please take a clearer photo"

=== WHAT TO ACCEPT (IMPORTANT!) ===
ACCEPT photos where:
- Full face is visible (eyes, nose, forehead)
- Hairline/forehead area is clearly visible
- Person is upright and facing camera
- Photo is clear enough to see hairline details
- Hair is thin, receding, or bald - THIS IS FINE! This is what we're simulating!

=== DO NOT REJECT FOR THESE (VERY IMPORTANT!) ===
- Bald or balding head - THIS IS FINE! We're simulating hair restoration.
- Receding hairline - THIS IS FINE! This is exactly what we need to see.
- Thin hair or visible scalp - THIS IS FINE! 
- Slightly imperfect lighting
- Minor angle variations (up to ±30 degrees is OK)
- Any facial expression - THIS IS FINE if hairline is visible!
- Glasses are OK as long as forehead/hairline is visible

=== KEY POINT ===
If you can clearly see the person's face AND their hairline/forehead area (without any covering), the photo is probably VALID.
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
  mimeType: string,
  treatmentType: 'teeth' | 'hair' = 'teeth'
): Promise<ValidationResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const validationPrompt = treatmentType === 'hair' ? HAIR_VALIDATION_PROMPT : TEETH_VALIDATION_PROMPT;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: validationPrompt },
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
    const { imageData, mimeType, treatmentType } = body;

    if (!imageData || typeof imageData !== 'string') {
      return buildResponse({ error: 'Image data is required' }, 400);
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return buildResponse({ error: 'MIME type is required' }, 400);
    }

    // Validate treatment type
    const validTreatmentType: 'teeth' | 'hair' = treatmentType === 'hair' ? 'hair' : 'teeth';

    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

    const validationResult = await validatePhotoWithGemini(base64Image, mimeType, validTreatmentType);

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

