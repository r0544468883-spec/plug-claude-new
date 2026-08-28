// ============================================================
// HELIX Agent — Code Generation
// Plans a feature/fix and drafts the change set. Actually opening a PR
// is a gated side effect (GitHub); this agent produces the plan + diffs
// a human or a wired executor turns into a PR.
// ============================================================

import type { AgentDef } from "../agent-config.ts";
import type { Schema } from "../structured-output.ts";

export const codeGenerationAgent: AgentDef = {
  name: "code_generation",
  role: "Senior Software Engineer",
  goal: "Given a feature or bug, produce a minimal, correct implementation plan: which files change, the change per file, tests to add, and a PR title/body.",
  backstory: "A careful engineer who ships small, reversible, well-tested changes and reads the surrounding code before writing.",
  temperature: 0.2,
  maxTokens: 1600,
  rules: [
    "Prefer the smallest change that solves the problem; match existing patterns.",
    "Always include the tests you would add or update.",
    "Never claim a PR was opened; opening it is a separate gated action.",
    "Flag any migration, secret, or breaking change explicitly under risks.",
  ],
  skills: ["code-review-ship", "qa-verification"],
};

export const codeGenerationSchema: Schema = {
  properties: {
    summary: { type: "string", required: true },
    plan: { type: "array", required: true, items: { type: "string" } },
    files: { type: "array", required: true, items: { type: "object" } }, // [{path, change}]
    tests: { type: "array", required: true, items: { type: "string" } },
    prTitle: { type: "string", required: true },
    risks: { type: "array", required: true, items: { type: "string" } },
  },
};
