import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Client with client headers to enforce RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current authenticated user
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access", details: authErr?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image, extra_info } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing image parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse base64 data URL
    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
      return new Response(
        JSON.stringify({ error: "Invalid image format. Must be a base64 data URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Gemini API key is not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct Gemini Multimodal request payload
    const promptText = `You are a professional botanist and plant pathologist. 
Analyze the provided image of a sick plant leaf or plant section. 
Diagnose any health issues, diseases, pest infestations, nutrient deficiencies, or watering issues. 

Return a JSON object matching this TypeScript interface exactly:
interface PlantDiagnosis {
  diagnosis: string;     // The name of the diagnosed issue, disease, or pest (e.g. "Spider Mites", "Powdery Mildew", "Overwatering Root Rot"). If the plant is completely healthy, return "Healthy".
  confidence: number;    // A score between 0.0 and 1.0 representing your diagnostic confidence.
  description: string;   // A short paragraph explaining the symptoms, causes, and details of the diagnosed issue.
  action_plan: string[]; // An array of step-by-step actionable instructions to treat and restore the plant (or care tips if healthy).
}

Optional extra context provided by the user about the plant's environment: ${extra_info || "None provided"}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    console.log("Calling Gemini API...");
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`Gemini API returned error ${geminiResponse.status}:`, errText);
      return new Response(
        JSON.stringify({ error: "Gemini API service failed to respond", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiResult = await geminiResponse.json();
    const candidateText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      console.error("Gemini returned invalid response structure:", JSON.stringify(geminiResult));
      return new Response(
        JSON.stringify({ error: "Invalid response structure from Gemini API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON string generated by Gemini
    let diagnosisResult;
    try {
      diagnosisResult = JSON.parse(candidateText.trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini output as JSON. Output was:", candidateText);
      return new Response(
        JSON.stringify({ error: "Failed to parse diagnostic output format", raw: candidateText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(diagnosisResult),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Internal error in diagnose-plant:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
