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

    // Fetch the user's current streak
    console.log(`Checking/updating streak status for user: ${user.id}`);
    const { data: streak, error: streakErr } = await supabaseClient
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streakErr) {
      console.error("Database query error:", streakErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to query streaks", details: streakErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!streak) {
      // If no streak row exists, pre-create one
      const { data: newStreak, error: createErr } = await supabaseClient
        .from("streaks")
        .insert({ user_id: user.id, current_streak: 0, longest_streak: 0, last_find_at: null })
        .select()
        .single();
        
      if (createErr) {
        return new Response(
          JSON.stringify({ error: "Failed to initialize streak", details: createErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(newStreak),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Perform check to see if the streak has been broken (gap > 1 day)
    let currentStreak = streak.current_streak;
    const lastFindAt = streak.last_find_at;

    if (lastFindAt) {
      const today = new Date();
      // Set hours to 0 to compare dates purely
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const lastFindParts = lastFindAt.split("-"); // yyyy-mm-dd
      const lastFindDateOnly = new Date(
        parseInt(lastFindParts[0]),
        parseInt(lastFindParts[1]) - 1,
        parseInt(lastFindParts[2])
      );

      const diffTime = todayDateOnly.getTime() - lastFindDateOnly.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // If more than 1 day has passed, the streak is broken and reset to 0
      if (diffDays > 1) {
        console.log(`User streak broken. Days since last find: ${diffDays}. Resetting streak to 0.`);
        const { data: updatedStreak, error: updateErr } = await supabaseClient
          .from("streaks")
          .update({ current_streak: 0 })
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateErr) {
          console.error("Database error resetting streak:", updateErr.message);
        } else {
          return new Response(
            JSON.stringify(updatedStreak),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify(streak),
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
