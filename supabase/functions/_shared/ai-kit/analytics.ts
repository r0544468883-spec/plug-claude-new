// ============================================================
// HELIX AI Kit — Analytics (future infra, wired now)
// Adopts (deferred): PostHog (product analytics) — this is also the seed
// of HELIX PIXEL's event nervous system. Default writes events to
// Postgres (ai_kit_events); set POSTHOG_KEY to also forward to PostHog.
// Privacy-first (תיקון 13): events stay on your Supabase unless you opt in.
//
// Use for: funnels, feature usage, PIXEL/Growth-Doctor intent signals.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const PH_KEY = Deno.env.get("POSTHOG_KEY");
const PH_HOST = Deno.env.get("POSTHOG_HOST") ?? "https://eu.posthog.com";
const FORWARD_PH = Boolean(PH_KEY);

export interface AnalyticsEvent {
  event: string;                       // "job_applied", "scan_completed", ...
  distinctId: string;                  // user/anon id
  properties?: Record<string, unknown>;
  workspaceId?: string;
  product?: string;                    // "plug" | "ops" | "rank" | ...
}

/**
 * Capture an event. Always persists to your DB (source of truth, privacy
 * moat); additionally forwards to PostHog when POSTHOG_KEY is set.
 */
export async function capture(sb: SupabaseClient, e: AnalyticsEvent): Promise<void> {
  // 1) First-party store (always) — the PIXEL data spine.
  await sb.from("ai_kit_events").insert({
    event: e.event, distinct_id: e.distinctId, product: e.product ?? null,
    properties: e.properties ?? {}, workspace_id: e.workspaceId ?? null,
  }).then(({ error }) => { if (error) console.warn("analytics insert:", error.message); });

  // 2) Optional forward to PostHog.
  if (FORWARD_PH) {
    fetch(`${PH_HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: PH_KEY,
        event: e.event,
        distinct_id: e.distinctId,
        properties: { ...e.properties, product: e.product, $groups: e.workspaceId ? { workspace: e.workspaceId } : undefined },
      }),
    }).catch((err) => console.warn("posthog forward failed:", err.message));
  }
}

/** Batch capture (e.g. flushing PIXEL client events). */
export async function captureBatch(sb: SupabaseClient, events: AnalyticsEvent[]): Promise<void> {
  if (events.length === 0) return;
  await sb.from("ai_kit_events").insert(events.map((e) => ({
    event: e.event, distinct_id: e.distinctId, product: e.product ?? null,
    properties: e.properties ?? {}, workspace_id: e.workspaceId ?? null,
  })));
  if (FORWARD_PH) await Promise.all(events.map((e) => capture(sb, e)));
}

export const analyticsForwardsToPosthog = FORWARD_PH;
