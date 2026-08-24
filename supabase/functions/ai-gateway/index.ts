import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// HELIX AI Gateway
// One HTTP surface exposing the whole _shared/ai-kit to every HELIX
// product (PLUG, CRM, STAGE, the marketing site's free-tools pages, and
// any future app). Consumers call this with fetch + a shared key — no
// need to copy the kit into each repo. Action-routed: { action, ...args }.
//
// Auth: X-Helix-Key header must equal HELIX_GATEWAY_KEY.
// ============================================================

import { llm } from "../_shared/ai-kit/llm-router.ts";
import { structured, type Schema } from "../_shared/ai-kit/structured-output.ts";
import { embed } from "../_shared/ai-kit/embeddings.ts";
import { indexDocument, search, searchHybrid } from "../_shared/ai-kit/vector-search.ts";
import { chunk } from "../_shared/ai-kit/chunking.ts";
import { toMarkdown } from "../_shared/ai-kit/doc-to-markdown.ts";
import { rememberFrom, recall } from "../_shared/ai-kit/memory-extraction.ts";
import { runGuards, nonEmpty, redactPii, noInjection, blocklist, maxLength, llmPolicy, type Guard } from "../_shared/ai-kit/guardrails.ts";
import { groupChat } from "../_shared/ai-kit/orchestrator.ts";
import { capture } from "../_shared/ai-kit/analytics.ts";
import { notify } from "../_shared/ai-kit/notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-helix-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Service-role client for kit functions that touch the DB (vector store,
// memory, analytics). RLS is bypassed here by design — the gateway is the
// trusted server boundary; the shared key is the gate.
function sbAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// Build a guard chain from a compact spec sent by the caller.
function buildGuards(spec: unknown): Guard[] {
  const g: Guard[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;
  if (s.nonEmpty) g.push(nonEmpty);
  if (s.redactPii) g.push(redactPii);
  if (s.noInjection) g.push(noInjection);
  if (typeof s.maxLength === "number") g.push(maxLength(s.maxLength));
  if (Array.isArray(s.blocklist)) g.push(blocklist(s.blocklist as string[]));
  if (typeof s.policy === "string") g.push(llmPolicy(s.policy));
  return g;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // ── Shared-key auth ────────────────────────────────────────
  const key = req.headers.get("x-helix-key");
  const expected = Deno.env.get("HELIX_GATEWAY_KEY");
  if (!expected || key !== expected) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }

  const action = body.action as string;
  if (!action) return json({ error: "missing action" }, 400);

  try {
    switch (action) {
      // ── generation ──────────────────────────────────────────
      case "llm": {
        const r = await llm(body.request as Parameters<typeof llm>[0]);
        return json({ ok: true, ...r });
      }
      case "structured": {
        const r = await structured(body.request as Parameters<typeof structured>[0], body.schema as Schema, body.maxAttempts as number | undefined);
        return json({ ok: true, ...r });
      }
      case "stream": {
        // Streaming is served by the dedicated `ai-stream` function (SSE);
        // the gateway returns a pointer so clients don't buffer here.
        return json({ ok: false, error: "use the ai-stream function for streaming" }, 400);
      }

      // ── embeddings + retrieval ──────────────────────────────
      case "embed": {
        const vectors = await embed(body.texts as string[]);
        return json({ ok: true, vectors });
      }
      case "index": {
        const n = await indexDocument(sbAdmin(), body.doc as Parameters<typeof indexDocument>[1], body.options as Parameters<typeof indexDocument>[2]);
        return json({ ok: true, chunks: n });
      }
      case "search": {
        const rows = await search(sbAdmin(), body.namespace as string, body.query as string, (body.options ?? {}) as Parameters<typeof search>[3]);
        return json({ ok: true, matches: rows });
      }
      case "searchHybrid": {
        const rows = await searchHybrid(sbAdmin(), body.namespace as string, body.query as string, (body.options ?? {}) as Parameters<typeof searchHybrid>[3]);
        return json({ ok: true, matches: rows });
      }

      // ── document processing ─────────────────────────────────
      case "toMarkdown": {
        const r = await toMarkdown(body.input as Parameters<typeof toMarkdown>[0]);
        return json({ ok: true, ...r });
      }
      case "chunk": {
        const chunks = chunk(body.text as string, body.options as Parameters<typeof chunk>[1]);
        return json({ ok: true, chunks });
      }

      // ── memory ──────────────────────────────────────────────
      case "remember": {
        const r = await rememberFrom(sbAdmin(), body.text as string, (body.scope ?? {}) as Parameters<typeof rememberFrom>[2], (body.options ?? {}) as Parameters<typeof rememberFrom>[3]);
        return json({ ok: true, ...r });
      }
      case "recall": {
        const memories = await recall(sbAdmin(), body.query as string, (body.scope ?? {}) as Parameters<typeof recall>[2]);
        return json({ ok: true, memories });
      }

      // ── guardrails ──────────────────────────────────────────
      case "guard": {
        const r = await runGuards(body.text as string, buildGuards(body.guards));
        return json({ ok: true, ...r });
      }

      // ── multi-agent ─────────────────────────────────────────
      case "groupChat": {
        const r = await groupChat(body.options as Parameters<typeof groupChat>[0]);
        return json({ ok: true, ...r });
      }

      // ── analytics + notifications ───────────────────────────
      case "capture": {
        await capture(sbAdmin(), body.event as Parameters<typeof capture>[1]);
        return json({ ok: true });
      }
      case "notify": {
        const r = await notify(sbAdmin(), body.input as Parameters<typeof notify>[1]);
        return json({ ok: true, ...r });
      }

      default:
        return json({ error: `unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error(`ai-gateway [${action}] error:`, err);
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
