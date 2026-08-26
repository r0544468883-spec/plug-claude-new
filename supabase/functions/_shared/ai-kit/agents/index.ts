// ============================================================
// HELIX Agent Registry — the "crew_factory" (Polsia's AGENT_MAP)
// One place that knows every agent: its definition + output schema.
// runNamedAgent() is the single entry point — it builds context, runs
// the agent tracked (audit + activity), and returns validated output.
// Agents are product-agnostic; the caller passes product + workspace.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AgentDef, TaskDef } from "../agent-config.ts";
import type { Schema } from "../structured-output.ts";
import { buildContext } from "../context.ts";
import { runTrackedAgent, type TrackedRunResult } from "../agent-runtime.ts";

import { financeAgent, financeSchema } from "./finance.ts";
import { adsManagementAgent, adsManagementSchema } from "./ads-management.ts";
import { competitorResearchAgent, competitorResearchSchema } from "./competitor-research.ts";
import { customerSupportAgent, customerSupportSchema } from "./customer-support.ts";
import { strategyAgent, strategySchema } from "./strategy.ts";
import { orchestratorAgent, orchestratorSchema } from "./orchestrator.ts";
import { codeGenerationAgent, codeGenerationSchema } from "./code-generation.ts";
import { deploymentAgent, deploymentSchema } from "./deployment.ts";

export interface AgentEntry {
  agent: AgentDef;
  schema: Schema;
}

/** Every HELIX agent, keyed by its stable name. */
export const AGENT_REGISTRY: Record<string, AgentEntry> = {
  finance: { agent: financeAgent, schema: financeSchema },
  ads_management: { agent: adsManagementAgent, schema: adsManagementSchema },
  competitor_research: { agent: competitorResearchAgent, schema: competitorResearchSchema },
  customer_support: { agent: customerSupportAgent, schema: customerSupportSchema },
  strategy: { agent: strategyAgent, schema: strategySchema },
  orchestrator: { agent: orchestratorAgent, schema: orchestratorSchema },
  code_generation: { agent: codeGenerationAgent, schema: codeGenerationSchema },
  deployment: { agent: deploymentAgent, schema: deploymentSchema },
};

export type AgentName = keyof typeof AGENT_REGISTRY;

export const AGENT_NAMES: string[] = Object.keys(AGENT_REGISTRY);

export interface RunNamedAgentOptions {
  product?: string;
  workspaceId?: string;
  userId?: string;
  /** Build the company brief (config + KPIs + activity + memory) into the run. Default true. */
  withContext?: boolean;
  /** Extra task-specific context string appended verbatim. */
  extraContext?: string;
}

/**
 * Run any registered agent by name. Assembles context, runs it tracked
 * (audit row + activity event), and returns the validated structured
 * output. Never throws on agent failure — see TrackedRunResult.status.
 */
export async function runNamedAgent<T = Record<string, unknown>>(
  sb: SupabaseClient,
  name: string,
  task: { description: string; expectedOutput?: string; context?: string },
  opts: RunNamedAgentOptions = {},
): Promise<TrackedRunResult<T>> {
  const entry = AGENT_REGISTRY[name];
  if (!entry) throw new Error(`runNamedAgent: unknown agent "${name}". Known: ${AGENT_NAMES.join(", ")}`);

  const context = opts.withContext === false
    ? undefined
    : await buildContext(sb, {
        workspaceId: opts.workspaceId,
        userId: opts.userId,
        product: opts.product,
        query: task.description,
      });

  const taskDef: TaskDef = {
    description: task.description,
    expectedOutput: task.expectedOutput,
    context: [task.context, opts.extraContext].filter(Boolean).join("\n\n") || undefined,
    schema: entry.schema,
  };

  return runTrackedAgent<T>(sb, {
    agent: entry.agent,
    task: taskDef,
    product: opts.product,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    context,
  });
}
