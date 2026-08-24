// ============================================================
// HELIX AI Kit — Structured Output
// Adopts: pydantic/pydantic-ai (retry-until-output-validates)
//
// Ask the model for JSON, validate it against a lightweight schema,
// and re-prompt with the validation error until it conforms (or the
// attempt budget runs out). Same guarantee as the Workflow tool's
// schema option, now available to every edge function.
// ============================================================

import { llm, type LlmRequest, type LlmResult } from "./llm-router.ts";

// Minimal JSON-schema-ish validator — no external dep. Covers the
// shapes edge functions actually need (objects, arrays, primitives,
// required, enum). For richer validation, swap in zod via npm: specifier.
export interface FieldSpec {
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  enum?: unknown[];
  items?: FieldSpec;                 // for arrays
  properties?: Record<string, FieldSpec>; // for objects
}

export type Schema = { properties: Record<string, FieldSpec>; };

function validate(value: unknown, spec: FieldSpec, path = "$"): string[] {
  const errs: string[] = [];
  const t = Array.isArray(value) ? "array" : typeof value;
  if (spec.type === "array") {
    if (!Array.isArray(value)) return [`${path}: expected array, got ${t}`];
    if (spec.items) value.forEach((v, i) => errs.push(...validate(v, spec.items!, `${path}[${i}]`)));
    return errs;
  }
  if (spec.type === "object") {
    if (t !== "object" || value === null) return [`${path}: expected object, got ${t}`];
    for (const [k, s] of Object.entries(spec.properties ?? {})) {
      const has = Object.prototype.hasOwnProperty.call(value, k);
      if (!has) { if (s.required) errs.push(`${path}.${k}: required`); continue; }
      errs.push(...validate((value as Record<string, unknown>)[k], s, `${path}.${k}`));
    }
    return errs;
  }
  if (t !== spec.type) errs.push(`${path}: expected ${spec.type}, got ${t}`);
  if (spec.enum && !spec.enum.includes(value)) errs.push(`${path}: must be one of ${JSON.stringify(spec.enum)}`);
  return errs;
}

export function validateAgainst(value: unknown, schema: Schema): string[] {
  return validate(value, { type: "object", properties: schema.properties, required: true });
}

/** Robust JSON extraction — handles ```fences```, prose wrappers, trailing text. */
export function extractJson(text: string): unknown {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) s = fence[1].trim();
  else {
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) s = m[1].trim();
  }
  return JSON.parse(s);
}

export interface StructuredResult<T> {
  data: T;
  attempts: number;
  raw: LlmResult;
}

/**
 * Call the model and coerce its answer to `schema`. On invalid output,
 * re-prompts with the concrete validation errors, up to maxAttempts.
 */
export async function structured<T = unknown>(
  req: LlmRequest,
  schema: Schema,
  maxAttempts = 3,
): Promise<StructuredResult<T>> {
  const schemaHint =
    `\n\nRespond with ONLY valid JSON matching this shape (no prose, no code fence):\n` +
    JSON.stringify(schema.properties, null, 2);

  const messages = [...req.messages];
  let last: LlmResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await llm({
      ...req,
      messages: attempt === 1
        ? [...messages.slice(0, -1),
           { ...messages[messages.length - 1], content: messages[messages.length - 1].content + schemaHint }]
        : messages,
    });

    try {
      const parsed = extractJson(last.text);
      const errs = validateAgainst(parsed, schema);
      if (errs.length === 0) return { data: parsed as T, attempts: attempt, raw: last };
      messages.push({ role: "assistant", content: last.text });
      messages.push({
        role: "user",
        content: `That output failed validation:\n${errs.join("\n")}\nReturn corrected JSON only.`,
      });
    } catch (e) {
      messages.push({ role: "assistant", content: last.text });
      messages.push({ role: "user", content: `That was not valid JSON (${(e as Error).message}). Return JSON only.` });
    }
  }
  throw new Error(`structured(): output did not validate after ${maxAttempts} attempts`);
}
