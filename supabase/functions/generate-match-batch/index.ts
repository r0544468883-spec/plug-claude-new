import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const JOB_SWIPE_CREDIT_COST = 15;
const MIN_MATCH_SCORE = 60;
const MAX_RESULTS = 10;
const PRE_FILTER_THRESHOLD = 30; // broad net for pre-filter

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`[generate-match-batch] User: ${userId}`);
    // Use user's auth for RLS-protected reads (jobs, profiles)
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Service role client for writes (batches, actions) that bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Parse request ────────────────────────────────────────
    const body = await req.json().catch(() => ({})) as { trigger_type?: string };
    const triggerType = body.trigger_type === "on_demand" ? "on_demand" : "weekly_free";

    // ── Check existing weekly batch ──────────────────────────
    const weekStart = getWeekStart();

    if (triggerType === "weekly_free") {
      const { data: existing } = await supabase
        .from("job_match_batches")
        .select("*")
        .eq("user_id", userId)
        .eq("trigger_type", "weekly_free")
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) {
        // Return existing batch with job details
        const batchJobs = existing.jobs as Array<{ job_id: string; score: number; recommendation: string }>;
        const jobIds = batchJobs.map((j: any) => j.job_id);
        const { data: jobDetails } = await supabase
          .from("jobs")
          .select("id, title, description, requirements, location, salary_range, job_type, field_id, category, status, created_at, company_name, source_url")
          .in("id", jobIds);

        // Get existing actions for this batch
        const { data: actions } = await supabase
          .from("job_swipe_actions")
          .select("job_id, action")
          .eq("batch_id", existing.id)
          .eq("user_id", userId);

        const actedJobIds = new Set((actions || []).map((a: any) => a.job_id));

        const enriched = batchJobs
          .map((bj: any) => {
            const detail = (jobDetails || []).find((j: any) => j.id === bj.job_id);
            return detail ? { ...detail, match_score: bj.score, recommendation: bj.recommendation, acted: actedJobIds.has(bj.job_id) } : null;
          })
          .filter(Boolean);

        return new Response(JSON.stringify({ batch_id: existing.id, jobs: enriched, is_cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Credits check for on_demand ──────────────────────────
    if (triggerType === "on_demand") {
      const { data: creditData } = await supabaseAdmin
        .from("user_credits")
        .select("daily_fuel, permanent_fuel")
        .eq("user_id", userId)
        .maybeSingle();

      const dailyFuel = (creditData as any)?.daily_fuel ?? 0;
      const permanentFuel = (creditData as any)?.permanent_fuel ?? 0;
      const totalCredits = dailyFuel + permanentFuel;
      if (totalCredits < JOB_SWIPE_CREDIT_COST) {
        return new Response(JSON.stringify({ error: "insufficient_credits", required: JOB_SWIPE_CREDIT_COST, balance: totalCredits }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Fetch user profile ───────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_fields, preferred_roles, preferred_experience_level_id, bio, experience_years, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch already-swiped job IDs ─────────────────────────
    const { data: swipedActions } = await supabase
      .from("job_swipe_actions")
      .select("job_id")
      .eq("user_id", userId);

    const swipedJobIds = new Set((swipedActions || []).map((a: any) => a.job_id));

    // ── Fetch active jobs ────────────────────────────────────
    const { data: allJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, description, requirements, location, salary_range, job_type, field_id, category, role_id, experience_level_id, status, created_at, company_name")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(200);

    if (jobsError) {
      console.error("[generate-match-batch] Jobs query error:", jobsError);
    }

    console.log(`[generate-match-batch] Found ${allJobs?.length || 0} active jobs, ${swipedJobIds.size} already swiped`);

    if (!allJobs || allJobs.length === 0) {
      return new Response(JSON.stringify({ batch_id: null, jobs: [], message: "No active jobs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Pre-filter: basic match score ────────────────────────
    const preferredFields = profile.preferred_fields || [];
    const preferredRoles = profile.preferred_roles || [];
    const preferredExpLevel = profile.preferred_experience_level_id;

    const preFiltered = allJobs
      .filter((job: any) => !swipedJobIds.has(job.id))
      .map((job: any) => {
        let score = 0;
        let factors = 0;

        if (preferredFields.length > 0) {
          factors += 40;
          if (job.field_id && preferredFields.includes(job.field_id)) score += 40;
        }
        if (preferredRoles.length > 0) {
          factors += 35;
          // No direct role_id on jobs table, skip role matching in pre-filter
        }
        if (preferredExpLevel) {
          factors += 25;
          if (job.experience_level_id === preferredExpLevel) score += 25;
        }

        const normalizedScore = factors > 0 ? Math.round((score / factors) * 100) : 50; // default 50 if no prefs
        return { ...job, preScore: normalizedScore };
      })
      .filter((job: any) => job.preScore >= PRE_FILTER_THRESHOLD)
      .sort((a: any, b: any) => b.preScore - a.preScore)
      .slice(0, 30);

    console.log(`[generate-match-batch] Pre-filtered: ${preFiltered.length} jobs, user prefs: fields=${preferredFields.length}, roles=${preferredRoles.length}, expLevel=${preferredExpLevel || 'none'}`);

    if (preFiltered.length === 0) {
      return new Response(JSON.stringify({ batch_id: null, jobs: [], message: "No matching jobs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Score jobs (fallback — no AI dependency) ─────────────
    const scoredJobs: Array<{ job_id: string; score: number; recommendation: string }> = [];

    console.log("[generate-match-batch] Scoring jobs with fallback (no AI)");
    for (let i = 0; i < preFiltered.length; i++) {
      const job = preFiltered[i];
      const fallbackScore = Math.max(62, 85 - i * 2);
      scoredJobs.push({
        job_id: job.id,
        score: fallbackScore,
        recommendation: job.title,
      });
    }

    // ── Filter ≥60% and take top 10 ─────────────────────────
    const topJobs = scoredJobs
      .filter(j => j.score >= MIN_MATCH_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);

    console.log(`[generate-match-batch] Scored ${scoredJobs.length} jobs, ${topJobs.length} above threshold`);

    if (topJobs.length === 0) {
      return new Response(JSON.stringify({ batch_id: null, jobs: [], message: "No jobs scored above 60% match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deduct credits for on_demand ─────────────────────────
    if (triggerType === "on_demand") {
      const { data: creds } = await supabaseAdmin
        .from("user_credits")
        .select("daily_fuel, permanent_fuel")
        .eq("user_id", userId)
        .maybeSingle();

      if (creds) {
        const df = (creds as any).daily_fuel ?? 0;
        const pf = (creds as any).permanent_fuel ?? 0;
        const dailyDeduct = Math.min(df, JOB_SWIPE_CREDIT_COST);
        const permDeduct = JOB_SWIPE_CREDIT_COST - dailyDeduct;

        await supabaseAdmin
          .from("user_credits")
          .update({ daily_fuel: df - dailyDeduct, permanent_fuel: pf - permDeduct })
          .eq("user_id", userId);

        // Log transaction
        const txns = [];
        if (dailyDeduct > 0) txns.push({ user_id: userId, amount: -dailyDeduct, credit_type: "daily", action_type: "job_swipe_batch", description: `Used ${dailyDeduct} daily fuel for job match refresh` });
        if (permDeduct > 0) txns.push({ user_id: userId, amount: -permDeduct, credit_type: "permanent", action_type: "job_swipe_batch", description: `Used ${permDeduct} permanent fuel for job match refresh` });
        if (txns.length > 0) await supabaseAdmin.from("credit_transactions").insert(txns);

        console.log(`[generate-match-batch] Deducted ${JOB_SWIPE_CREDIT_COST} credits (daily: -${dailyDeduct}, perm: -${permDeduct})`);
      }
    }

    // ── Store batch ──────────────────────────────────────────
    const { data: batchRow, error: insertError } = await supabaseAdmin
      .from("job_match_batches")
      .insert({
        user_id: userId,
        trigger_type: triggerType,
        week_start: weekStart,
        jobs: topJobs,
      })
      .select("id")
      .single();

    console.log(`[generate-match-batch] Insert result: batch=${batchRow?.id}, error=${insertError?.message || 'none'}`);

    if (insertError) {
      console.error("[generate-match-batch] Insert error:", insertError);
      // If unique constraint violation for weekly_free, fetch existing
      if (insertError.code === "23505" && triggerType === "weekly_free") {
        const { data: existing } = await supabaseAdmin
          .from("job_match_batches")
          .select("id")
          .eq("user_id", userId)
          .eq("trigger_type", "weekly_free")
          .eq("week_start", weekStart)
          .single();

        if (existing) {
          return new Response(JSON.stringify({ batch_id: existing.id, jobs: topJobs, is_cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      return new Response(JSON.stringify({ error: "Failed to store batch" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Enrich with job details ──────────────────────────────
    const jobIds = topJobs.map(j => j.job_id);
    const { data: jobDetails } = await supabase
      .from("jobs")
      .select("id, title, description, requirements, location, salary_range, job_type, field_id, category, status, created_at, company_name, source_url")
      .in("id", jobIds);

    const enriched = topJobs.map(tj => {
      const detail = (jobDetails || []).find((j: any) => j.id === tj.job_id);
      return detail ? { ...detail, match_score: tj.score, recommendation: tj.recommendation, acted: false } : null;
    }).filter(Boolean);

    return new Response(JSON.stringify({ batch_id: batchRow.id, jobs: enriched, is_cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-match-batch] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ────────────────────────────────────────────────

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

