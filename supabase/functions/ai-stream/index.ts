import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { streamResponse } from "../_shared/ai-kit/stream.ts";

// ============================================================
// HELIX AI Stream — SSE streaming companion to ai-gateway.
// Separate function because streaming needs a long-lived response the
// JSON gateway can't return. Same shared-key auth.
// Body: { messages, system?, model?, maxTokens?, temperature? }
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-helix-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("POST only", { status: 405, headers: corsHeaders });

  const key = req.headers.get("x-helix-key");
  if (key !== Deno.env.get("HELIX_GATEWAY_KEY")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return new Response("invalid JSON", { status: 400, headers: corsHeaders });
  }

  return streamResponse({
    messages: body.messages as Parameters<typeof streamResponse>[0]["messages"],
    system: body.system as string | undefined,
    model: body.model as string | undefined,
    maxTokens: body.maxTokens as number | undefined,
    temperature: body.temperature as number | undefined,
  }, corsHeaders);
});
