// ============================================================
// HELIX AI Kit — Agent Runtime tests
// Proves the Polsia CI property: the full agent path runs with NO API
// keys, NO database, and ZERO spend. The LLM is mocked via AI_KIT_MOCK
// and Supabase is a tiny in-memory stub.
//
//   deno test --allow-env supabase/functions/_shared/ai-kit/agent-runtime.test.ts
// ============================================================

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { llm } from "./llm-router.ts";
import { isSandbox, sideEffect } from "./sandbox.ts";
import { runTrackedAgent, logActivity } from "./agent-runtime.ts";
import type { AgentDef, TaskDef } from "./agent-config.ts";

// ── Minimal in-memory Supabase stub (only what the runtime touches) ──
function fakeSupabase() {
  const tables: Record<string, unknown[]> = {};
  const api = {
    from(table: string) {
      tables[table] ??= [];
      const rows = tables[table];
      const builder = {
        _select: "*",
        insert(row: Record<string, unknown> | Record<string, unknown>[]) {
          const arr = Array.isArray(row) ? row : [row];
          for (const r of arr) rows.push({ id: crypto.randomUUID(), ...r });
          return {
            select: () => ({
              single: () => Promise.resolve({ data: rows[rows.length - 1], error: null }),
            }),
            then: (res: (v: { error: null }) => void) => res({ error: null }),
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: (_col: string, val: unknown) => {
              const r = rows.find((x) => (x as Record<string, unknown>).id === val);
              if (r) Object.assign(r, patch);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
      return builder;
    },
    _tables: tables,
  };
  return api;
}

Deno.test("llm() returns the mock without any network/key", async () => {
  Deno.env.set("AI_KIT_MOCK", "true");
  Deno.env.set("AI_KIT_MOCK_RESPONSE", '{"summary":"mocked"}');
  const r = await llm({ messages: [{ role: "user", content: "hi" }] });
  assertEquals(r.costUsd, 0);
  assert(r.text.includes("mocked"));
});

Deno.test("sideEffect is skipped and simulated in sandbox", async () => {
  Deno.env.set("AI_KIT_MOCK", "true"); // implies sandbox
  assertEquals(isSandbox(), true);
  let realRan = false;
  const out = await sideEffect(
    "twitter.post",
    () => { realRan = true; return { id: "REAL" }; },
    () => ({ id: "sandbox" }),
  );
  assertEquals(realRan, false);
  assertEquals(out.id, "sandbox");
});

Deno.test("runTrackedAgent records an audit row + activity, no keys", async () => {
  Deno.env.set("AI_KIT_MOCK", "true");
  Deno.env.set("AI_KIT_MOCK_RESPONSE", "Drafted 3 cold emails.");
  // deno-lint-ignore no-explicit-any
  const sb = fakeSupabase() as any;

  const agent: AgentDef = { name: "email_outreach", role: "SDR", goal: "Find prospects" };
  const task: TaskDef = { description: "Find 3 prospects and draft emails" };

  const res = await runTrackedAgent(sb, { agent, task, product: "sdr", userId: "u1" });

  assertEquals(res.status, "completed");
  assert(res.durationMs >= 0);
  assertEquals(sb._tables["ai_kit_agent_runs"].length, 1);
  const run = sb._tables["ai_kit_agent_runs"][0];
  assertEquals(run.status, "completed");
  assertEquals(run.sandbox, true);
  // one activity event emitted for the completed run
  assert(sb._tables["ai_kit_activity"].some((a: Record<string, unknown>) => a.action === "task_completed"));
});

Deno.test("logActivity never throws on stub", async () => {
  // deno-lint-ignore no-explicit-any
  const sb = fakeSupabase() as any;
  await logActivity(sb, { agent: "finance", action: "insight", summary: "MRR up 4%" });
  assertEquals(sb._tables["ai_kit_activity"].length, 1);
});
