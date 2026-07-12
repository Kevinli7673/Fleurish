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
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing image parameter (base64 string required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("PLANT_ID_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Plant.id API key is not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Plant.id API v3
    console.log("Calling Plant.id identification endpoint...");
    const plantIdRes = await fetch("https://api.plant.id/v3/identification", {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: [image],
        similar_images: true,
        details: ["common_names", "taxonomy"],
      }),
    });

    if (!plantIdRes.ok) {
      const errText = await plantIdRes.text();
      console.error(`Plant.id error: ${plantIdRes.status} ${errText}`);
      return new Response(
        JSON.stringify({ error: "Plant identification service failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plantIdData = await plantIdRes.json();
    const suggestions = plantIdData.result?.classification?.suggestions;

    if (!suggestions || suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No plants were identified in the image" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the top suggestion
    const bestSuggestion = suggestions[0];
    const scientificName = bestSuggestion.name;
    const commonNamesList = bestSuggestion.details?.common_names || [];
    const commonName = commonNamesList[0] || bestSuggestion.name;
    const confidence = bestSuggestion.probability;
    const family = bestSuggestion.details?.taxonomy?.family || "Botanical Species";

    // Initialize Supabase Client with service role key to insert/query reference table
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the plant already exists in the database
    console.log(`Checking database for plant: ${scientificName}`);
    let { data: plant, error: queryErr } = await supabaseClient
      .from("plants")
      .select("*")
      .ilike("scientific_name", scientificName)
      .maybeSingle();

    if (queryErr) {
      console.error("Database query error:", queryErr.message);
    }

    // If it doesn't exist, seed it dynamically
    if (!plant) {
      console.log(`Plant not found in database. Seeding new plant row: ${scientificName}`);
      const { data: newPlant, error: insertErr } = await supabaseClient
        .from("plants")
        .insert({
          common_name: commonName.split(',')[0].trim().replace(/\b\w/g, c => c.toUpperCase()),
          scientific_name: scientificName,
          care_tips: "Provide bright indirect light. Allow the soil to dry out between waterings. Clean the leaves with a damp cloth.",
          light_requirement: "Bright indirect light",
          water_requirement: "Moderate water"
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Database insert error:", insertErr.message);
        throw new Error(`Failed to seed plant in database: ${insertErr.message}`);
      }
      plant = newPlant;
    }

    return new Response(
      JSON.stringify({
        plant_id: plant.id,
        common_name: (plant.common_name.toLowerCase() === plant.scientific_name.toLowerCase() && commonName) ? commonName : plant.common_name,
        scientific_name: plant.scientific_name,
        confidence: Number(confidence.toFixed(2)),
        care_tips: plant.care_tips,
        light_requirement: plant.light_requirement,
        water_requirement: plant.water_requirement,
        family: family
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Internal error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
