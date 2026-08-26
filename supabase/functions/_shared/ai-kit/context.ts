// ============================================================
// HELIX AI Kit — Context provider
// Distilled from Polsia's get_full_context(db): assemble the company
// brief ONCE and hand the same object to every agent, instead of each
// agent re-querying. Three layers:
//   1. config + kpis   — the durable "who we are / where we stand" row
//   2. recentActivity  — what the agent team just did (short-term memory)
//   3. memory          — semantic recall of relevant past insights (pgvector)
// renderContext() flattens it into a compact prompt block.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { search } from "./vector-search.ts";

export interface HelixContext {
  workspaceId?: string;
  product?: string;
  config: Record<string, unknown>;   // mission, value_prop, pricing, goals, voice...
  kpis: Record<string, unknown>;     // mrr, active_users, churn, cac, ltv, nps...
  recentActivity: { agent: string; action: string; summary: string; level: string; at: string }[];
  memory: string[];                  // top-k semantic snippets (empty if pgvector unconfigured)
}

/**
 * Vector namespace for an agent's memory, scoped per product so insights
 * from one product (e.g. SHOP) never bleed into another (e.g. SDR) for
 * the same workspace. Omitting product returns the shared 'memory' space
 * (used by cross-cutting agents like strategy/orchestrator).
 */
export function memoryNamespace(product?: string): string {
  return product && product !== "_default" ? `memory:${product}` : "memory";
}

export interface BuildContextOptions {
  workspaceId?: string;
  userId?: string;
  product?: string;
  /** if set, pull semantically-relevant memory for this query */
  query?: string;
  memoryK?: number;
  activityLimit?: number;
}

/** Assemble the full context object an agent should reason over. */
export async function buildContext(
  sb: SupabaseClient,
  opts: BuildContextOptions = {},
): Promise<HelixContext> {
  const product = opts.product ?? "_default";

  // 1. Durable company brief + KPIs
  let config: Record<string, unknown> = {};
  let kpis: Record<string, unknown> = {};
  if (opts.workspaceId) {
    const { data } = await sb
      .from("ai_kit_context")
      .select("config, kpis")
      .eq("workspace_id", opts.workspaceId)
      .eq("product", product)
      .maybeSingle();
    if (data) { config = data.config ?? {}; kpis = data.kpis ?? {}; }
  }

  // 2. Recent activity (short-term shared memory of the team)
  let recentActivity: HelixContext["recentActivity"] = [];
  {
    let q = sb
      .from("ai_kit_activity")
      .select("agent, action, summary, level, created_at")
      .order("created_at", { ascending: false })
      .limit(opts.activityLimit ?? 10);
    if (opts.workspaceId) q = q.eq("workspace_id", opts.workspaceId);
    if (opts.product && opts.product !== "_default") q = q.eq("product", opts.product);
    const { data } = await q;
    recentActivity = (data ?? []).map((r) => ({
      agent: r.agent, action: r.action, summary: r.summary,
      level: r.level, at: r.created_at,
    }));
  }

  // 3. Semantic recall (best-effort — no-op if pgvector/embeddings unset)
  let memory: string[] = [];
  if (opts.query) {
    try {
      const matches = await search(sb, memoryNamespace(opts.product), opts.query, {
        count: opts.memoryK ?? 5,
        workspaceId: opts.workspaceId,
      });
      memory = matches.map((m) => m.content);
    } catch (e) {
      console.warn("buildContext: memory recall skipped:", (e as Error).message);
    }
  }

  return { workspaceId: opts.workspaceId, product, config, kpis, recentActivity, memory };
}

/** Flatten the context into a compact prompt block for an agent's system/user turn. */
export function renderContext(ctx: HelixContext): string {
  const parts: string[] = [];
  if (Object.keys(ctx.config).length) {
    parts.push(`## Company\n${JSON.stringify(ctx.config, null, 2)}`);
  }
  if (Object.keys(ctx.kpis).length) {
    parts.push(`## Current KPIs\n${JSON.stringify(ctx.kpis, null, 2)}`);
  }
  if (ctx.recentActivity.length) {
    parts.push(
      `## Recent team activity\n` +
      ctx.recentActivity.map((a) => `- [${a.agent}] ${a.action}: ${a.summary}`).join("\n"),
    );
  }
  if (ctx.memory.length) {
    parts.push(`## Relevant past insights\n${ctx.memory.map((m) => `- ${m}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

/** Upsert the durable company brief / KPIs for a (workspace, product). */
export async function setContext(
  sb: SupabaseClient,
  args: { workspaceId: string; product?: string; userId?: string; config?: Record<string, unknown>; kpis?: Record<string, unknown> },
): Promise<void> {
  const { error } = await sb.from("ai_kit_context").upsert({
    workspace_id: args.workspaceId,
    product: args.product ?? "_default",
    user_id: args.userId ?? null,
    ...(args.config ? { config: args.config } : {}),
    ...(args.kpis ? { kpis: args.kpis } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,product" });
  if (error) throw new Error(`setContext: ${error.message}`);
}
