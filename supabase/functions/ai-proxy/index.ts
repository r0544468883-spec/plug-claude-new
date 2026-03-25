import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================
// PLUG AI Proxy — routes AI calls from Chrome Extension
// Validates X-Plug-Key, calls Claude, returns structured result
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-plug-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Validate X-Plug-Key ───────────────────────────────────
    const plugKey = req.headers.get("x-plug-key");
    const expectedKey = Deno.env.get("PLUG_CLIENT_KEY");

    if (!plugKey || !expectedKey || plugKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse request ─────────────────────────────────────────
    const body = await req.json() as {
      prompt?: string;
      returnType?: "json" | "text";
      maxTokens?: number;
    };

    const { prompt, returnType = "json", maxTokens = 1024 } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get Claude API key ────────────────────────────────────
    const claudeApiKey =
      Deno.env.get("CLAUDE_API_KEY") ||
      Deno.env.get("ANTHROPIC_API_KEY");

    if (!claudeApiKey) {
      console.error("No Claude API key configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Call Claude (with retry on 429) ──────────────────────
    const claudeBody = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: Math.min(maxTokens, 4096),
      messages: [{ role: "user", content: prompt }],
    });

    let claudeRes: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: claudeBody,
      });

      if (claudeRes.status !== 429) break;

      // Rate limited — wait before retrying (Retry-After header or 5s default)
      const retryAfter = parseInt(claudeRes.headers.get("retry-after") || "5");
      const waitMs = Math.min(retryAfter * 1000, 8000);
      console.warn(`Claude rate limited (attempt ${attempt + 1}), waiting ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    if (!claudeRes || !claudeRes.ok) {
      const errText = await claudeRes?.text() ?? "no response";
      console.error("Claude API error:", claudeRes?.status, errText);
      return new Response(
        JSON.stringify({ error: `AI error: ${claudeRes?.status} — ${errText.substring(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeRes.json() as {
      content?: Array<{ type: string; text: string }>;
    };
    const textContent = claudeData.content?.[0]?.text ?? "";

    // ── Parse result ──────────────────────────────────────────
    let result: unknown;

    if (returnType === "json") {
      try {
        // Strip markdown code fences if Claude wraps the JSON
        const cleaned = textContent
          .replace(/^```(?:json)?\s*/m, "")
          .replace(/\s*```\s*$/m, "")
          .trim();
        result = JSON.parse(cleaned);
      } catch {
        // If JSON parsing fails, return raw text so caller can handle gracefully
        result = textContent;
      }
    } else {
      result = textContent;
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-proxy unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
