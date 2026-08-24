// ============================================================
// HELIX AI Client — portable SDK for the AI Gateway
// Copy this ONE file into any HELIX repo (CRM, STAGE, marketing site,
// future apps). Zero dependencies, works in Node/Next server routes,
// Deno, and the browser (for non-secret actions). It calls the shared
// ai-gateway / ai-stream edge functions over fetch.
//
// Setup per repo:
//   HELIX_AI_GATEWAY_URL = https://<project>.functions.supabase.co
//   HELIX_GATEWAY_KEY    = <shared secret matching the gateway>
//
//   const ai = createHelixAI();               // reads env
//   const { text } = await ai.llm({ messages: [{ role:"user", content:"hi" }] });
// ============================================================

export interface HelixAIConfig {
  gatewayUrl?: string;   // defaults to env HELIX_AI_GATEWAY_URL
  key?: string;          // defaults to env HELIX_GATEWAY_KEY
  fetchImpl?: typeof fetch;
}

function env(name: string): string | undefined {
  // Works under Node (process.env) and Deno (Deno.env) without hard deps.
  const g = globalThis as unknown as { process?: { env?: Record<string, string> }; Deno?: { env: { get(k: string): string | undefined } } };
  return g.process?.env?.[name] ?? g.Deno?.env.get(name);
}

export function createHelixAI(cfg: HelixAIConfig = {}) {
  const base = (cfg.gatewayUrl ?? env("HELIX_AI_GATEWAY_URL") ?? "").replace(/\/$/, "");
  const key = cfg.key ?? env("HELIX_GATEWAY_KEY") ?? "";
  const doFetch = cfg.fetchImpl ?? fetch;
  if (!base) throw new Error("HELIX_AI_GATEWAY_URL not set");

  async function call<T = unknown>(action: string, payload: Record<string, unknown>): Promise<T> {
    const res = await doFetch(`${base}/ai-gateway`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-helix-key": key },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(`helix-ai [${action}]: ${data.error ?? res.status}`);
    }
    return data as T;
  }

  return {
    // generation
    llm: (request: Record<string, unknown>) =>
      call<{ text: string; model: string; costUsd: number; usage: unknown }>("llm", { request }),
    structured: <T = unknown>(request: Record<string, unknown>, schema: unknown, maxAttempts?: number) =>
      call<{ data: T; attempts: number }>("structured", { request, schema, maxAttempts }),

    // embeddings + retrieval
    embed: (texts: string[]) => call<{ vectors: number[][] }>("embed", { texts }),
    index: (doc: Record<string, unknown>, options?: Record<string, unknown>) =>
      call<{ chunks: number }>("index", { doc, options }),
    search: (namespace: string, query: string, options?: Record<string, unknown>) =>
      call<{ matches: Array<{ content: string; score: number; metadata: Record<string, unknown> }> }>("search", { namespace, query, options }),
    searchHybrid: (namespace: string, query: string, options?: Record<string, unknown>) =>
      call<{ matches: Array<{ content: string; score: number; metadata: Record<string, unknown> }> }>("searchHybrid", { namespace, query, options }),

    // documents
    toMarkdown: (input: Record<string, unknown>) =>
      call<{ markdown: string; kind: string; via: string }>("toMarkdown", { input }),
    chunk: (text: string, options?: Record<string, unknown>) =>
      call<{ chunks: string[] }>("chunk", { text, options }),

    // memory
    remember: (text: string, scope: Record<string, unknown>, options?: Record<string, unknown>) =>
      call<{ added: unknown[]; skipped: number }>("remember", { text, scope, options }),
    recall: (query: string, scope: Record<string, unknown>) =>
      call<{ memories: Array<{ type: string; content: string }> }>("recall", { query, scope }),

    // guardrails
    guard: (text: string, guards: Record<string, unknown>) =>
      call<{ ok: boolean; tripwire?: string; sanitized?: string }>("guard", { text, guards }),

    // multi-agent
    groupChat: (options: Record<string, unknown>) =>
      call<{ transcript: unknown[]; final: string; turns: number }>("groupChat", { options }),

    // analytics + notifications (PIXEL spine)
    capture: (event: Record<string, unknown>) => call("capture", { event }),
    notify: (input: Record<string, unknown>) => call("notify", { input }),

    /**
     * Stream tokens via SSE from the ai-stream function. Calls onDelta for
     * each chunk; resolves with the full text. Browser + server compatible.
     */
    async stream(
      req: { messages: unknown[]; system?: string; model?: string; maxTokens?: number; temperature?: number },
      onDelta: (delta: string) => void,
    ): Promise<string> {
      const res = await doFetch(`${base}/ai-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-helix-key": key },
        body: JSON.stringify(req),
      });
      if (!res.ok || !res.body) throw new Error(`helix-ai [stream]: ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const p = line.slice(6).trim();
          if (!p || p === "[DONE]") continue;
          try {
            const evt = JSON.parse(p);
            if (evt.type === "text-delta" && evt.delta) { full += evt.delta; onDelta(evt.delta); }
          } catch { /* ignore keep-alive */ }
        }
      }
      return full;
    },
  };
}

export type HelixAI = ReturnType<typeof createHelixAI>;
