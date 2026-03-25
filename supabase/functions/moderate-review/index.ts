import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_PATTERNS = [
  /\b(fuck|shit|bitch|bastard|cunt|כוס|זין|חרא|מניאק|בן זונה)\b/i,
  /\b(racist|racism|גזען|גזענות)\b/i,
];

function isContentClean(text: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get unmoderated reviews
    const { data: reviews, error } = await supabaseAdmin
      .from("company_reviews")
      .select("id, pros, cons, advice")
      .eq("is_approved", false);

    if (error) throw error;
    if (!reviews?.length) {
      return new Response(JSON.stringify({ moderated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let approved = 0;
    let rejected = 0;

    for (const review of reviews) {
      const texts = [review.pros, review.cons, review.advice].filter(Boolean).join(" ");
      const clean = isContentClean(texts);

      await supabaseAdmin
        .from("company_reviews")
        .update({ is_approved: clean })
        .eq("id", review.id);

      clean ? approved++ : rejected++;
    }

    return new Response(
      JSON.stringify({ moderated: reviews.length, approved, rejected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("moderate-review error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
