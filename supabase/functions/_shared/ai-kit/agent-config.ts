// ============================================================
// HELIX AI Kit — Agent Config
// Steals from: crewAI (declarative role/goal/backstory agents)
//
// Declare an agent (or a "department" of them) as data, not code. One
// consistent shape for every HELIX product's agent team — Researcher /
// Maker / Critic / Orchestrator — so spinning up a new product's team is
// filling in a config, not writing plumbing. Renders to a system prompt.
// ============================================================

import { llm, type ChatMessage } from "./llm-router.ts";
import { structured, type Schema } from "./structured-output.ts";
import { withSkills } from "./skills/registry.ts";

export interface AgentDef {
  name: string;
  role: string;                 // "SDR Researcher"
  goal: string;                 // "Find 3 buying signals for the lead"
  backstory?: string;           // persona / voice
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** hard rules appended to the system prompt (guardrails as text) */
  rules?: string[];
  /** capability skills loaded from skills/registry.ts (STANDING RULE:
   *  domain knowledge lives in a shared skill, not a duplicated prompt) */
  skills?: string[];
}

export interface TaskDef {
  description: string;
  expectedOutput?: string;
  /** optional JSON schema — when set, the agent returns validated data */
  schema?: Schema;
  context?: string;             // upstream results / retrieved docs
}

export function renderSystemPrompt(agent: AgentDef): string {
  const parts = [
    `You are ${agent.name}, acting as: ${agent.role}.`,
    `Your goal: ${agent.goal}.`,
    agent.backstory ? `Background: ${agent.backstory}` : "",
    agent.rules?.length ? `Rules you must follow:\n${agent.rules.map((r) => `- ${r}`).join("\n")}` : "",
  ];
  // STANDING RULE: load capability from the shared skill library.
  return withSkills(parts.filter(Boolean).join("\n\n"), agent.skills);
}

export interface AgentRun<T = string> {
  output: T;
  agent: string;
}

/** Run a single agent against a task. Returns validated data if schema given. */
export async function runAgent<T = string>(agent: AgentDef, task: TaskDef): Promise<AgentRun<T>> {
  const userContent = [
    task.description,
    task.context ? `\nContext:\n${task.context}` : "",
    task.expectedOutput ? `\nExpected output: ${task.expectedOutput}` : "",
  ].filter(Boolean).join("\n");

  const messages: ChatMessage[] = [{ role: "user", content: userContent }];
  const common = {
    system: renderSystemPrompt(agent),
    model: agent.model,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    costTag: `agent:${agent.name}`,
  };

  if (task.schema) {
    const { data } = await structured<T>({ ...common, messages }, task.schema);
    return { output: data, agent: agent.name };
  }
  const { text } = await llm({ ...common, messages });
  return { output: text as unknown as T, agent: agent.name };
}

/**
 * Sequential crew: run agents in order, threading each output into the
 * next agent's task context. Simplest crewAI "process". For dynamic
 * turn-taking use the orchestrator (autogen pattern) instead.
 */
export async function runCrewSequential(
  steps: { agent: AgentDef; task: TaskDef }[],
): Promise<AgentRun[]> {
  const results: AgentRun[] = [];
  let carry = "";
  for (const { agent, task } of steps) {
    const r = await runAgent({ ...agent }, { ...task, context: [task.context, carry].filter(Boolean).join("\n\n") });
    results.push(r);
    carry = typeof r.output === "string" ? r.output : JSON.stringify(r.output);
  }
  return results;
}
