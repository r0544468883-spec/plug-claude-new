// ============================================================
// HELIX AI Kit — Guardrails
// Steals from: openai/openai-agents (input/output guardrails)
//
// Validate what goes INTO an LLM and what comes OUT of it, before it
// reaches a user or a side effect. Directly closes the "gray-path" risk
// in the OPS engagement agent (auto-comment) and any user-facing chat.
// Guardrails are composable predicates; a "tripwire" hit blocks the call.
// ============================================================

import { llm } from "./llm-router.ts";

export interface GuardResult {
  ok: boolean;
  tripwire?: string;       // which guard fired
  reason?: string;
  /** optionally-sanitized replacement text */
  sanitized?: string;
}

export type Guard = (text: string) => Promise<GuardResult> | GuardResult;

// ── Built-in fast (non-LLM) guards ───────────────────────────

/** Block empty or trivially short output. */
export const nonEmpty: Guard = (t) =>
  t.trim().length >= 2 ? { ok: true } : { ok: false, tripwire: "non-empty", reason: "output too short" };

/** Cap length (defends against runaway generations before they ship). */
export function maxLength(chars: number): Guard {
  return (t) => t.length <= chars ? { ok: true }
    : { ok: false, tripwire: "max-length", reason: `exceeds ${chars} chars`, sanitized: t.slice(0, chars) };
}

/** Redact obvious PII (emails, IL/intl phones, long digit runs). */
export const redactPii: Guard = (t) => {
  let s = t;
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]");
  s = s.replace(/(?:\+?972[-\s]?|0)(?:\d[-\s]?){8,9}\d/g, "[phone]");
  s = s.replace(/\b\d{9,}\b/g, "[number]");
  const changed = s !== t;
  return changed ? { ok: true, sanitized: s } : { ok: true };
};

/** Block a list of forbidden substrings (competitor names, banned claims). */
export function blocklist(terms: string[]): Guard {
  const lower = terms.map((x) => x.toLowerCase());
  return (t) => {
    const hit = lower.find((x) => t.toLowerCase().includes(x));
    return hit ? { ok: false, tripwire: "blocklist", reason: `contains "${hit}"` } : { ok: true };
  };
}

/** Reject prompt-injection markers in untrusted input. */
export const noInjection: Guard = (t) => {
  const patterns = [/ignore (all|previous) instructions/i, /system prompt/i, /you are now/i, /disregard/i];
  const hit = patterns.find((p) => p.test(t));
  return hit ? { ok: false, tripwire: "injection", reason: "possible prompt injection" } : { ok: true };
};

// ── LLM-based guard: moderation / policy check ───────────────
/**
 * Uses a cheap model to judge whether text violates a policy. Returns a
 * tripwire on violation. Keep policies short and concrete.
 */
export function llmPolicy(policy: string, model = "anthropic/claude-haiku-4-5-20251001"): Guard {
  return async (t) => {
    const { text } = await llm({
      model, maxTokens: 10, temperature: 0,
      system: `You are a content policy checker. Policy: ${policy}\nAnswer with exactly "PASS" or "FAIL".`,
      messages: [{ role: "user", content: t }],
    });
    return /FAIL/i.test(text)
      ? { ok: false, tripwire: "llm-policy", reason: policy }
      : { ok: true };
  };
}

/**
 * Run guards in order. Sanitizing guards mutate the working text and
 * continue; blocking guards stop immediately. Returns final text + any
 * tripwire that fired.
 */
export async function runGuards(text: string, guards: Guard[]): Promise<GuardResult> {
  let working = text;
  for (const g of guards) {
    const r = await g(working);
    if (!r.ok) return { ok: false, tripwire: r.tripwire, reason: r.reason };
    if (r.sanitized != null) working = r.sanitized;
  }
  return { ok: true, sanitized: working };
}
