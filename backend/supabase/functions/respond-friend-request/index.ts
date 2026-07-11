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

    const { friend_id, accept } = await req.json();

    if (!friend_id || accept === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing friend_id or accept parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In a response, friend_id is the user who initiated the request.
    // So the row is: user_id = friend_id, friend_id = user.id.
    console.log(`Responding to friend request from ${friend_id} to ${user.id}. Accept: ${accept}`);

    if (accept) {
      // Accept friendship: update status to 'accepted'
      const { data, error: updateErr } = await supabaseClient
        .from("friendships")
        .update({ status: "accepted" })
        .eq("user_id", friend_id)
        .eq("friend_id", user.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Database update error:", updateErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to accept friend request", details: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: "accepted", friendship: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Decline/reject friendship: delete the record
      const { error: deleteErr } = await supabaseClient
        .from("friendships")
        .delete()
        .eq("user_id", friend_id)
        .eq("friend_id", user.id);

      if (deleteErr) {
        console.error("Database delete error:", deleteErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to decline friend request", details: deleteErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: "declined" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Internal error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
