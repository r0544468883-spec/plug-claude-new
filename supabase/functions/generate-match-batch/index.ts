import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY") || Deno.env.get("ANTHROPIC_API_KEY");

const JOB_SWIPE_CREDIT_COST = 15;
const MIN_MATCH_SCORE = 60;
const MAX_RESULTS = 10;
const PRE_FILTER_THRESHOLD = 30; // broad net for pre-filter
const AI_BATCH_SIZE = 5;

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
          .select("id, title, description, requirements, location, salary_range, job_type, field_id, category, status, created_at, company_name")
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
      const { data: creditData } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      const balance = (creditData as any)?.balance ?? 0;
      if (balance < JOB_SWIPE_CREDIT_COST) {
        return new Response(JSON.stringify({ error: "insufficient_credits", required: JOB_SWIPE_CREDIT_COST, balance }), {
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

    // ── AI scoring via Claude Haiku ──────────────────────────
    const scoredJobs: Array<{ job_id: string; score: number; recommendation: string }> = [];

    if (!CLAUDE_API_KEY) {
      // Fallback: assign decent scores to newest jobs when no API key
      console.warn("[generate-match-batch] No Claude API key — using fallback scores");
      for (let i = 0; i < preFiltered.length; i++) {
        const job = preFiltered[i];
        // Give descending scores from 85 down, so newest/best pre-filtered jobs rank highest
        const fallbackScore = Math.max(60, 85 - i * 2);
        scoredJobs.push({
          job_id: job.id,
          score: fallbackScore,
          recommendation: "",
        });
      }
    } else {
      // Batch AI scoring in groups
      for (let i = 0; i < preFiltered.length; i += AI_BATCH_SIZE) {
        const batch = preFiltered.slice(i, i + AI_BATCH_SIZE);
        const promises = batch.map((job: any) => scoreJobWithAI(profile, job));
        const results = await Promise.allSettled(promises);

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.status === "fulfilled" && result.value) {
            scoredJobs.push({
              job_id: batch[j].id,
              score: result.value.score,
              recommendation: result.value.recommendation,
            });
          } else {
            // Fallback to pre-filter score
            scoredJobs.push({
              job_id: batch[j].id,
              score: batch[j].preScore,
              recommendation: "",
            });
          }
        }
      }
    }

    // ── Filter ≥60% and take top 10 ─────────────────────────
    const topJobs = scoredJobs
      .filter(j => j.score >= MIN_MATCH_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);

    if (topJobs.length === 0) {
      return new Response(JSON.stringify({ batch_id: null, jobs: [], message: "No jobs scored above 60% match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deduct credits for on_demand ─────────────────────────
    if (triggerType === "on_demand") {
      await supabaseAdmin.rpc("deduct_user_credits", {
        p_user_id: userId,
        p_amount: JOB_SWIPE_CREDIT_COST,
        p_action: "job_swipe_batch",
        p_description: "Job Match Refresh",
      }).catch((err: any) => {
        console.error("[generate-match-batch] Credit deduction failed:", err);
      });
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
      .select("id, title, description, requirements, location, salary_range, job_type, field_id, category, status, created_at, company_name")
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

async function scoreJobWithAI(
  profile: any,
  job: any
): Promise<{ score: number; recommendation: string } | null> {
  try {
    const prompt = `אתה מנתח התאמה בין מועמד למשרה. דרג את ההתאמה מ-0 עד 100 והסבר בקצרה למה.

פרופיל המועמד:
- שם: ${profile.full_name || "לא צוין"}
- ניסיון: ${profile.experience_years || "לא צוין"} שנים
- תחומים מועדפים: ${(profile.preferred_fields || []).join(", ") || "לא צוין"}
- תפקידים מועדפים: ${(profile.preferred_roles || []).join(", ") || "לא צוין"}
- ביו: ${(profile.bio || "").substring(0, 200)}

המשרה:
- כותרת: ${job.title}
- תיאור: ${(job.description || "").substring(0, 300)}
- דרישות: ${(job.requirements || "").substring(0, 200)}
- מיקום: ${job.location || "לא צוין"}
- סוג: ${job.job_type || "לא צוין"}

החזר JSON בפורמט: {"score": <0-100>, "recommendation": "<הסבר קצר בעברית>"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("[generate-match-batch] Claude error:", res.status);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      score: Math.max(0, Math.min(100, parsed.score || 0)),
      recommendation: parsed.recommendation || "",
    };
  } catch (err) {
    console.error("[generate-match-batch] AI scoring error:", err);
    return null;
  }
}
