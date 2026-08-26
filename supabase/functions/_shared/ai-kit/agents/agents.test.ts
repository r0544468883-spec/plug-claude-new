// ============================================================
// HELIX Agent Registry tests
// Proves all 8 agents are wired and return schema-valid output through
// runNamedAgent — with NO API keys, NO database, ZERO spend.
//
//   deno test --allow-env supabase/functions/_shared/ai-kit/agents/agents.test.ts
// ============================================================

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { AGENT_NAMES, AGENT_REGISTRY, runNamedAgent } from "./index.ts";

// Minimal in-memory Supabase stub (only what the runtime touches).
function fakeSupabase() {
  const tables: Record<string, unknown[]> = {};
  return {
    from(table: string) {
      tables[table] ??= [];
      const rows = tables[table];
      return {
        insert(row: Record<string, unknown> | Record<string, unknown>[]) {
          const arr = Array.isArray(row) ? row : [row];
          for (const r of arr) rows.push({ id: crypto.randomUUID(), ...r });
          return {
            select: () => ({ single: () => Promise.resolve({ data: rows[rows.length - 1], error: null }) }),
            then: (res: (v: { error: null }) => void) => res({ error: null }),
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: (_c: string, val: unknown) => {
              const r = rows.find((x) => (x as Record<string, unknown>).id === val);
              if (r) Object.assign(r, patch);
              return Promise.resolve({ error: null });
            },
          };
        },
        // buildContext reads: select().eq().eq().maybeSingle() and select().order().limit()
        select() {
          const chain = {
            eq: () => chain,
            order: () => chain,
            limit: () => Promise.resolve({ data: [], error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          };
          return chain;
        },
        _tables: tables,
      };
    },
    _tables: tables,
    // deno-lint-ignore no-explicit-any
  } as any;
}

// A schema-valid mock response per agent (matches each required shape).
const MOCK_BY_AGENT: Record<string, unknown> = {
  finance: { summary: "MRR steady", snapshot: { mrr: 1000 }, alerts: [], recommendations: ["hold"] },
  ads_management: { summary: "Cut waste", changes: ["pause adset X"], creative: ["hook A"], budgetRecommendation: "shift 20% to winner" },
  competitor_research: { summary: "Rival launched Y", competitors: [{ name: "R", move: "Y" }], insights: ["speed matters"], threats: ["price"], openings: ["niche"] },
  customer_support: { summary: "3 tickets", draftReplies: [{ to: "a@b.c", body: "hi" }], escalations: [] },
  strategy: { summary: "Focus retention", goals: ["cut churn"], kpisFocus: ["churn"], bets: [{ bet: "onboarding", owner: "code_generation", why: "activation" }], risks: ["cash"] },
  orchestrator: { summary: "Plan set", plan: [{ agent: "finance", task: "snapshot", priority: 1, why: "daily" }], priorities: ["revenue"] },
  code_generation: { summary: "Add flag", plan: ["edit config"], files: [{ path: "a.ts", change: "add" }], tests: ["unit"], prTitle: "feat: flag", risks: [] },
  deployment: { summary: "Ship v2", preflight: ["tests green"], steps: ["build", "push"], verification: ["health 200"], rollback: "revert tag" },
};

Deno.test("registry exposes all 8 agents", () => {
  assertEquals(AGENT_NAMES.length, 8);
  for (const name of AGENT_NAMES) assert(AGENT_REGISTRY[name].schema.properties.summary);
});

for (const name of Object.keys(MOCK_BY_AGENT)) {
  Deno.test(`runNamedAgent(${name}) returns schema-valid output, no keys`, async () => {
    Deno.env.set("AI_KIT_MOCK", "true");
    Deno.env.set("AI_KIT_MOCK_RESPONSE", JSON.stringify(MOCK_BY_AGENT[name]));
    const sb = fakeSupabase();

    const res = await runNamedAgent(sb, name, { description: `Do the ${name} job` }, {
      product: "test", userId: "u1", withContext: false,
    });

    assertEquals(res.status, "completed", res.error ?? "");
    assert(res.output && typeof res.output === "object");
    assertEquals((res.output as Record<string, unknown>).summary, (MOCK_BY_AGENT[name] as Record<string, unknown>).summary);
    // audit row closed as completed
    assertEquals(sb._tables["ai_kit_agent_runs"][0].status, "completed");
  });
}

Deno.test("unknown agent name throws", async () => {
  const sb = fakeSupabase();
  let threw = false;
  try {
    await runNamedAgent(sb, "nope", { description: "x" }, { withContext: false });
  } catch { threw = true; }
  assert(threw);
});
