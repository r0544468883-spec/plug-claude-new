// ============================================================
// HELIX AI Kit — Job Queue (future infra, wired now)
// Adopts (deferred): trigger.dev — with a Postgres-backed default
// (ai_kit_jobs table) so durable background work is available TODAY.
// When TRIGGER_API_URL is set, enqueue() forwards to trigger.dev instead.
//
// Use for: batch matching, enrichment, email sends, re-embedding — any
// work too slow for a request/response edge invocation.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const TRIGGER_URL = Deno.env.get("TRIGGER_API_URL");
const TRIGGER_KEY = Deno.env.get("TRIGGER_API_KEY");
const USE_TRIGGER = Boolean(TRIGGER_URL && TRIGGER_KEY);

export interface EnqueueOptions {
  type: string;                 // handler name, e.g. "reembed-namespace"
  payload: Record<string, unknown>;
  runAfter?: Date;              // delayed execution
  maxAttempts?: number;
  dedupeKey?: string;           // skip if an unfinished job shares this key
  workspaceId?: string;
}

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/** Enqueue durable background work. */
export async function enqueue(sb: SupabaseClient, opts: EnqueueOptions): Promise<string> {
  if (USE_TRIGGER) {
    const res = await fetch(`${TRIGGER_URL}/api/v1/tasks/${opts.type}/trigger`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TRIGGER_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ payload: opts.payload, options: { delay: opts.runAfter?.toISOString() } }),
    });
    const data = await res.json();
    return data.id;
  }

  // Postgres fallback: insert a job row; a pg_cron worker / edge poller drains it.
  if (opts.dedupeKey) {
    const { data: existing } = await sb.from("ai_kit_jobs")
      .select("id").eq("dedupe_key", opts.dedupeKey)
      .in("status", ["pending", "running"]).maybeSingle();
    if (existing) return existing.id as string;
  }
  const { data, error } = await sb.from("ai_kit_jobs").insert({
    type: opts.type, payload: opts.payload, status: "pending",
    run_after: opts.runAfter?.toISOString() ?? new Date().toISOString(),
    max_attempts: opts.maxAttempts ?? 3, dedupe_key: opts.dedupeKey ?? null,
    workspace_id: opts.workspaceId ?? null,
  }).select("id").single();
  if (error) throw new Error(`enqueue: ${error.message}`);
  return data.id as string;
}

/**
 * Claim up to `limit` due jobs (Postgres fallback only). Call from a
 * pg_cron-triggered edge function; process then markDone/markFailed.
 */
export async function claimJobs(sb: SupabaseClient, type: string, limit = 5): Promise<Job[]> {
  if (USE_TRIGGER) return []; // trigger.dev runs handlers itself
  const { data, error } = await sb.rpc("ai_kit_claim_jobs", {
    p_type: type, p_limit: limit,
  });
  if (error) throw new Error(`claimJobs: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, type: r.type as string,
    payload: r.payload as Record<string, unknown>, attempts: r.attempts as number,
  }));
}

export async function markDone(sb: SupabaseClient, id: string): Promise<void> {
  await sb.from("ai_kit_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", id);
}

export async function markFailed(sb: SupabaseClient, id: string, error: string): Promise<void> {
  await sb.rpc("ai_kit_fail_job", { p_id: id, p_error: error });
}

export const queueUsesTrigger = USE_TRIGGER;
