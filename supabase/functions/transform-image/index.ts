import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl, treatmentType } = await req.json();

    if (!imageUrl || !treatmentType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    // Convert to base64
    const base64Image = btoa(
      String.fromCharCode(...imageBytes)
    );

    // Determine MIME type from response or default to jpeg
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.startsWith("image/") ? contentType : "image/jpeg";

    // Create prompt based on treatment type
    const prompt = treatmentType === "teeth"
      ? "Transform this image to show perfect, white, aligned teeth. Make the teeth look naturally beautiful and professionally whitened. Keep the person's face and features exactly the same, only improve the teeth to look like they've had professional dental work. Maintain realistic lighting and natural appearance."
      : "Transform this image to show fuller, healthier, more voluminous hair. Make the hair look professionally styled and treated. Keep the person's face and features exactly the same, only improve the hair to look thicker, healthier, and more vibrant. Maintain realistic lighting and natural appearance.";

    // Use Gemini Nano-Banana (gemini-2.5-flash-image) for image generation
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API error:", errorData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to process image with Gemini API",
          details: errorData 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response structure:", JSON.stringify(geminiData, null, 2));

    // Extract the generated image from the response
    // According to the documentation, the response should have parts with inline_data
    const candidate = geminiData.candidates?.[0];
    if (!candidate) {
      console.error("No candidates in response:", geminiData);
      return new Response(
        JSON.stringify({ error: "No response from Gemini API" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const parts = candidate.content?.parts || [];
    let transformedImageData: string | null = null;

    // Look for inline_data in the response parts
    for (const part of parts) {
      if (part.inline_data?.data) {
        transformedImageData = part.inline_data.data;
        break;
      }
    }

    // If no image data found, check if there's text (error message)
    if (!transformedImageData) {
      const textParts = parts.filter((p: any) => p.text);
      if (textParts.length > 0) {
        console.log("Text response from Gemini:", textParts.map((p: any) => p.text).join(" "));
      }
      
      // Fallback: return original image if transformation failed
      return new Response(
        JSON.stringify({ 
          transformedUrl: imageUrl,
          warning: "Image transformation completed but no new image was generated"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Convert base64 to data URL
    const transformedUrl = `data:image/png;base64,${transformedImageData}`;

    return new Response(
      JSON.stringify({ transformedUrl }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});