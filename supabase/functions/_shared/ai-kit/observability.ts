// ============================================================
// HELIX AI Kit — Observability
// Adopts: langfuse (LLM tracing, cost, latency across products)
//
// Wraps any async LLM operation in a trace and ships it to Langfuse
// via its ingestion REST API. Fully no-op until LANGFUSE_PUBLIC_KEY /
// LANGFUSE_SECRET_KEY are set — so it is safe to wire everywhere now
// and "turn on" later without touching call sites.
// ============================================================

const HOST = Deno.env.get("LANGFUSE_HOST") ?? "https://cloud.langfuse.com";
const PUBLIC_KEY = Deno.env.get("LANGFUSE_PUBLIC_KEY");
const SECRET_KEY = Deno.env.get("LANGFUSE_SECRET_KEY");
const ENABLED = Boolean(PUBLIC_KEY && SECRET_KEY);

export interface TraceMeta {
  name: string;                         // e.g. "match-candidates"
  userId?: string;
  workspaceId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SpanRecord {
  name: string;
  input?: unknown;
  output?: unknown;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
  costUsd?: number;
  startMs: number;
  endMs: number;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
}

// crypto.randomUUID is available in the Deno edge runtime.
function id(): string {
  return crypto.randomUUID();
}
function nowIso(): string {
  return new Date().toISOString();
}

async function ingest(events: unknown[]): Promise<void> {
  if (!ENABLED || events.length === 0) return;
  try {
    const auth = btoa(`${PUBLIC_KEY}:${SECRET_KEY}`);
    await fetch(`${HOST}/api/public/ingestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ batch: events }),
    });
  } catch (e) {
    console.warn("langfuse ingest failed (non-fatal):", (e as Error).message);
  }
}

/**
 * Trace collects spans, then flushes one batch on end(). Cheap when
 * disabled: methods short-circuit and allocate nothing meaningful.
 */
export class Trace {
  private traceId = id();
  private spans: SpanRecord[] = [];
  constructor(private meta: TraceMeta) {}

  span(rec: SpanRecord) { if (ENABLED) this.spans.push(rec); }

  /** Time a function, record it as a span, return its result. */
  async observe<T>(name: string, fn: () => Promise<T>, extract?: (r: T) => Partial<SpanRecord>): Promise<T> {
    const startMs = performance.now();
    try {
      const out = await fn();
      if (ENABLED) this.span({ name, startMs, endMs: performance.now(), ...(extract?.(out) ?? {}) });
      return out;
    } catch (err) {
      if (ENABLED) this.span({ name, startMs, endMs: performance.now(), level: "ERROR", output: (err as Error).message });
      throw err;
    }
  }

  async end(output?: unknown): Promise<void> {
    if (!ENABLED) return;
    const events: unknown[] = [{
      id: id(), type: "trace-create", timestamp: nowIso(),
      body: {
        id: this.traceId, name: this.meta.name, userId: this.meta.userId,
        tags: this.meta.tags, output,
        metadata: { ...this.meta.metadata, workspaceId: this.meta.workspaceId },
      },
    }];
    for (const s of this.spans) {
      events.push({
        id: id(), type: "generation-create", timestamp: nowIso(),
        body: {
          id: id(), traceId: this.traceId, name: s.name, model: s.model,
          input: s.input, output: s.output, level: s.level ?? "DEFAULT",
          usage: s.usage ? { input: s.usage.inputTokens, output: s.usage.outputTokens, unit: "TOKENS" } : undefined,
          metadata: { costUsd: s.costUsd, latencyMs: Math.round(s.endMs - s.startMs) },
        },
      });
    }
    await ingest(events);
  }
}

export function trace(meta: TraceMeta): Trace {
  return new Trace(meta);
}

export const observabilityEnabled = ENABLED;
