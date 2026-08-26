// ============================================================
// HELIX Edge Function — agent-finance
// Reference wiring for the Finance agent. This is the pattern EVERY
// product clones to attach a shared agent: three thin pieces around the
// product-agnostic core.
//   1. DATA ADAPTER   — gather this product's numbers (Stripe here)
//   2. setContext     — write them as the workspace/product KPIs
//   3. runNamedAgent  — run "finance" tracked (audit + activity + memory)
// Everything else (prompt, schema, audit, feed, recall) is shared.
//
// POST { workspaceId, userId?, product?, question? }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { setContext } from "../_shared/ai-kit/context.ts";
import { runNamedAgent } from "../_shared/ai-kit/agents/index.ts";
import { remember } from "../_shared/ai-kit/agent-runtime.ts";
import { sideEffect } from "../_shared/ai-kit/sandbox.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── 1. DATA ADAPTER (the only per-product piece) ─────────────
// Read the product's real revenue signal. Best-effort: if STRIPE_SECRET_KEY
// is set we read live, otherwise we return an empty shape and let the agent
// reason over whatever KPIs already exist in context. Stripe reads are wrapped
// in sideEffect so a sandbox/preview run never hits the network.
async function gatherFinance(): Promise<Record<string, number>> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return {};
  return await sideEffect("stripe.read", async () => {
    const headers = { Authorization: `Bearer ${key}` };
    const [balRes, subRes] = await Promise.all([
      fetch("https://api.stripe.com/v1/balance", { headers }),
      fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100", { headers }),
    ]);
    const bal = balRes.ok ? await balRes.json() : null;
    const subs = subRes.ok ? await subRes.json() : null;
    const available = bal?.available?.reduce((s: number, a: { amount: number }) => s + a.amount, 0) ?? 0;
    const activeSubs = Array.isArray(subs?.data) ? subs.data.length : 0;
    const mrr = (subs?.data ?? []).reduce(
      (s: number, sub: { items?: { data?: { price?: { unit_amount?: number } }[] } }) =>
        s + (sub.items?.data?.[0]?.price?.unit_amount ?? 0), 0) / 100;
    return { available_balance_usd: available / 100, active_subscriptions: activeSubs, mrr_usd: mrr };
  }, () => ({})); // sandbox: no network, empty snapshot
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { workspaceId, userId, product = "dashboards", question } = await req.json();
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. gather → 2. persist as this workspace+product's KPIs
    const kpis = await gatherFinance();
    if (Object.keys(kpis).length) {
      await setContext(sb, { workspaceId, product, userId, kpis });
    }

    // 3. run the shared agent, tracked. buildContext() picks up the KPIs
    //    we just wrote plus recent activity + product-scoped memory.
    const res = await runNamedAgent(sb, "finance", {
      description: question ?? "Produce today's finance snapshot and flag any risks.",
    }, { product, workspaceId, userId });

    // Persist the headline as durable memory so tomorrow's run has continuity.
    if (res.status === "completed" && res.output) {
      const summary = (res.output as { summary?: string }).summary;
      if (summary) {
        await remember(sb, { agent: "finance", product, workspaceId, userId, content: summary });
      }
    }

    return new Response(JSON.stringify({
      runId: res.runId, status: res.status, output: res.output, error: res.error,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("agent-finance error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
