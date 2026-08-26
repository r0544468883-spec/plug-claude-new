// ============================================================
// HELIX AI Kit — LLM Router
// Adopts: BerriAI/litellm (unified multi-provider gateway)
//
// One call site for every LLM/embedding request across all HELIX
// products. Gives: provider routing, automatic fallback, retry with
// backoff, and per-call cost accounting. Claude-first by design; other
// providers only for capabilities Anthropic lacks (e.g. embeddings).
// ============================================================

import { CURRENT_AI_MODEL } from "../ai-models.ts";

export type Provider = "anthropic" | "openai" | "voyage";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LlmRequest {
  messages: ChatMessage[];
  system?: string;
  model?: string;          // provider-qualified, e.g. "anthropic/claude-haiku-4-5-20251001"
  maxTokens?: number;
  temperature?: number;
  /** ordered fallback models tried if the primary errors (not on 4xx) */
  fallbacks?: string[];
  /** opaque tag for cost attribution (product / feature / workspace) */
  costTag?: string;
  signal?: AbortSignal;
}

export interface LlmResult {
  text: string;
  model: string;
  provider: Provider;
  usage: { inputTokens: number; outputTokens: number };
  costUsd: number;
  latencyMs: number;
}

// ── Pricing table (USD per 1M tokens). Update alongside ai-models.ts. ──
// Kept intentionally small; unknown models fall back to a safe estimate.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 0.8, out: 4 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  // embeddings priced per-1M input only (out = 0)
  "voyage-3-lite": { in: 0.02, out: 0 },
  "text-embedding-3-small": { in: 0.02, out: 0 },
};

function priceOf(model: string) {
  return PRICING[model] ?? { in: 1, out: 5 }; // conservative unknown-model estimate
}

export function estimateCostUsd(model: string, inTok: number, outTok: number): number {
  const p = priceOf(model);
  return (inTok / 1_000_000) * p.in + (outTok / 1_000_000) * p.out;
}

/** Split "provider/model" → [provider, model]. Bare model → anthropic. */
function parseModel(model: string): [Provider, string] {
  if (model.includes("/")) {
    const [prov, ...rest] = model.split("/");
    return [prov as Provider, rest.join("/")];
  }
  if (model.startsWith("gpt")) return ["openai", model];
  if (model.startsWith("voyage")) return ["voyage", model];
  if (model.startsWith("text-embedding")) return ["openai", model];
  return ["anthropic", model];
}

function keyFor(provider: Provider): string | undefined {
  switch (provider) {
    case "anthropic":
      return Deno.env.get("CLAUDE_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY");
    case "openai":
      return Deno.env.get("OPENAI_API_KEY");
    case "voyage":
      return Deno.env.get("VOYAGE_API_KEY");
  }
}

async function sleep(ms: number, signal?: AbortSignal) {
  await new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new DOMException("aborted", "AbortError"));
    });
  });
}

// ── Provider adapters ────────────────────────────────────────
async function callAnthropic(model: string, req: LlmRequest, apiKey: string): Promise<Omit<LlmResult, "latencyMs" | "costUsd" | "provider">> {
  const sys = [req.system, ...req.messages.filter((m) => m.role === "system").map((m) => m.content)]
    .filter(Boolean).join("\n\n");
  const messages = req.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: req.signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(req.maxTokens ?? 1024, 8192),
      ...(sys ? { system: sys } : {}),
      ...(req.temperature != null ? { temperature: req.temperature } : {}),
      messages,
    }),
  });
  if (!res.ok) throw new HttpError(res.status, await res.text());
  const data = await res.json();
  return {
    text: data.content?.[0]?.text ?? "",
    model,
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    },
  };
}

async function callOpenAi(model: string, req: LlmRequest, apiKey: string) {
  const messages = [
    ...(req.system ? [{ role: "system", content: req.system }] : []),
    ...req.messages,
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: req.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 1024,
      ...(req.temperature != null ? { temperature: req.temperature } : {}),
      messages,
    }),
  });
  if (!res.ok) throw new HttpError(res.status, await res.text());
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

class HttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}: ${body.substring(0, 300)}`);
  }
}

/** True for errors worth retrying/falling back on (429/5xx/network). */
function isTransient(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  return err instanceof TypeError; // fetch network failure
}

/**
 * Main entry. Tries primary model, then fallbacks, each with up to
 * 3 backoff attempts on transient errors. Returns text + cost + usage.
 */
export async function llm(req: LlmRequest): Promise<LlmResult> {
  const primary = req.model ?? `anthropic/${CURRENT_AI_MODEL}`;

  // ── Mock hook (Polsia's CLAUDE_CLI_MOCK equivalent) ──────────
  // When AI_KIT_MOCK is set, short-circuit before any network call:
  // return AI_KIT_MOCK_RESPONSE verbatim (a string, usually JSON so
  // structured() also validates). Lets the whole agent stack run in
  // tests / CI with no API keys and zero spend. Tests set the env per
  // case to script a specific response.
  const mock = Deno.env.get("AI_KIT_MOCK");
  if (mock) {
    return {
      text: Deno.env.get("AI_KIT_MOCK_RESPONSE") ?? '{"result": "AI Kit mock response"}',
      model: parseModel(primary)[1],
      provider: parseModel(primary)[0],
      usage: { inputTokens: 0, outputTokens: 0 },
      costUsd: 0,
      latencyMs: 0,
    };
  }

  const chain = [primary, ...(req.fallbacks ?? [])];
  let lastErr: unknown;

  for (const qualified of chain) {
    const [provider, model] = parseModel(qualified);
    const apiKey = keyFor(provider);
    if (!apiKey) { lastErr = new Error(`No API key for provider ${provider}`); continue; }

    for (let attempt = 0; attempt < 3; attempt++) {
      const started = performance.now();
      try {
        const base =
          provider === "openai"
            ? await callOpenAi(model, req, apiKey)
            : await callAnthropic(model, req, apiKey);
        const latencyMs = Math.round(performance.now() - started);
        const costUsd = estimateCostUsd(model, base.usage.inputTokens, base.usage.outputTokens);
        return { ...base, provider, latencyMs, costUsd };
      } catch (err) {
        lastErr = err;
        if (!isTransient(err) || attempt === 2) break; // non-retryable → next model
        const backoff = Math.min(500 * 2 ** attempt, 4000);
        await sleep(backoff, req.signal);
      }
    }
  }
  throw lastErr ?? new Error("llm(): all models failed");
}
