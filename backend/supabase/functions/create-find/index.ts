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

    const { photo_url, lat, lng, plant_id, caption, is_public } = await req.json();

    if (!photo_url) {
      return new Response(
        JSON.stringify({ error: "Missing photo_url parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the find (the database triggers on_find_created will handle the streak updates and feed events)
    console.log(`Inserting find for user: ${user.id}`);
    const { data: find, error: findErr } = await supabaseClient
      .from("finds")
      .insert({
        user_id: user.id,
        plant_id: plant_id || null,
        photo_url,
        lat: lat || null,
        lng: lng || null,
        caption: caption || null,
        is_public: is_public ?? true,
      })
      .select(`
        *,
        plants (*),
        profiles!finds_user_id_fkey (*)
      `)
      .single();

    if (findErr) {
      console.error("Database error inserting find:", findErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to record plant find", details: findErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ find }),
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
