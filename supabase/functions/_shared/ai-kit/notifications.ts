// ============================================================
// HELIX AI Kit — Notifications (future infra, wired now)
// Adopts (deferred): novuhq/novu — unified multi-channel notifications.
// Default path reuses the EXISTING HELIX email edge functions, so a
// single notify() call works today; set NOVU_API_KEY to route through
// Novu (adds push/SMS/in-app + user preferences) later without changes.
//
// Consolidates the many scattered *-email functions behind one API.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOVU_KEY = Deno.env.get("NOVU_API_KEY");
const NOVU_URL = Deno.env.get("NOVU_API_URL") ?? "https://api.novu.co";
const USE_NOVU = Boolean(NOVU_KEY);

export type Channel = "email" | "push" | "sms" | "in_app" | "whatsapp";

export interface NotifyInput {
  /** logical event name → maps to a Novu workflow or an internal handler */
  event: string;
  to: { userId?: string; email?: string; phone?: string };
  channels?: Channel[];         // preferred channels; default ["email"]
  payload: Record<string, unknown>;
  workspaceId?: string;
}

/**
 * Send a notification. Via Novu when configured, else falls back to the
 * project's existing email pipeline (send-email-via-user) + an in_app row.
 */
export async function notify(sb: SupabaseClient, input: NotifyInput): Promise<{ via: "novu" | "fallback" }> {
  if (USE_NOVU) {
    await fetch(`${NOVU_URL}/v1/events/trigger`, {
      method: "POST",
      headers: { Authorization: `ApiKey ${NOVU_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.event,
        to: { subscriberId: input.to.userId ?? input.to.email, email: input.to.email, phone: input.to.phone },
        payload: input.payload,
      }),
    });
    return { via: "novu" };
  }

  // Fallback: honor requested channels with what already exists.
  const channels = input.channels ?? ["email"];

  if (channels.includes("in_app")) {
    await sb.from("ai_kit_notifications").insert({
      user_id: input.to.userId ?? null, workspace_id: input.workspaceId ?? null,
      event: input.event, payload: input.payload, read: false,
    });
  }

  if (channels.includes("email") && input.to.email) {
    // Reuse the existing email edge function rather than re-implementing SMTP.
    const base = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (base && key) {
      await fetch(`${base}/functions/v1/send-email-via-user`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: input.to.email, event: input.event, data: input.payload }),
      }).catch((e) => console.warn("notify email fallback failed:", e.message));
    }
  }

  // push / sms / whatsapp: left to their dedicated handlers until Novu is on.
  return { via: "fallback" };
}

export const notificationsUseNovu = USE_NOVU;
