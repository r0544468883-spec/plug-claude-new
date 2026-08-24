// ============================================================
// HELIX AI Kit — Streaming
// Adopts: vercel/ai (streaming-first LLM UX in TS)
//
// Server-Sent-Events streaming of Claude responses for chat UIs
// (plug-chat, SHOP support agent, CHIEF). Framework-free: emits the
// AI-SDK-compatible SSE data shape so the browser `useChat`/`useCompletion`
// hooks — or a plain EventSource — can consume it directly.
// ============================================================

import { CURRENT_AI_MODEL } from "../ai-models.ts";
import type { ChatMessage } from "./llm-router.ts";

export interface StreamOptions {
  messages: ChatMessage[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** called once with final text + usage when the stream completes */
  onFinish?: (r: { text: string; inputTokens: number; outputTokens: number }) => void | Promise<void>;
  signal?: AbortSignal;
}

const enc = new TextEncoder();

/**
 * Returns a ReadableStream of SSE lines. Each token arrives as
 * `data: {"type":"text-delta","delta":"..."}` and the stream ends with
 * `data: {"type":"finish", ...}` then `data: [DONE]`.
 */
export function streamClaude(opts: StreamOptions): ReadableStream<Uint8Array> {
  const apiKey = Deno.env.get("CLAUDE_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("streamClaude: no Claude API key");

  const sys = [opts.system, ...opts.messages.filter((m) => m.role === "system").map((m) => m.content)]
    .filter(Boolean).join("\n\n");
  const messages = opts.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));

  return new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let full = "";
      let inTok = 0, outTok = 0;
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: opts.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: opts.model ?? CURRENT_AI_MODEL,
            max_tokens: Math.min(opts.maxTokens ?? 2048, 8192),
            stream: true,
            ...(sys ? { system: sys } : {}),
            ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
            messages,
          }),
        });
        if (!res.ok || !res.body) throw new Error(`Claude stream ${res.status}: ${await res.text?.() ?? ""}`);

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += value;
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            let evt: Record<string, unknown>;
            try { evt = JSON.parse(payload); } catch { continue; }
            if (evt.type === "content_block_delta") {
              const delta = (evt.delta as { text?: string })?.text ?? "";
              if (delta) { full += delta; send({ type: "text-delta", delta }); }
            } else if (evt.type === "message_start") {
              inTok = ((evt.message as { usage?: { input_tokens?: number } })?.usage?.input_tokens) ?? 0;
            } else if (evt.type === "message_delta") {
              outTok = ((evt.usage as { output_tokens?: number })?.output_tokens) ?? outTok;
            }
          }
        }
        send({ type: "finish", inputTokens: inTok, outputTokens: outTok });
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        await opts.onFinish?.({ text: full, inputTokens: inTok, outputTokens: outTok });
      } catch (err) {
        send({ type: "error", error: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });
}

/** Convenience: wrap streamClaude in a Response with SSE headers + CORS. */
export function streamResponse(opts: StreamOptions, corsHeaders: Record<string, string> = {}): Response {
  return new Response(streamClaude(opts), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
