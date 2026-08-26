// ============================================================
// HELIX AI Kit — Agent Runtime
// The glue that turns a bare agent call into an observable, auditable,
// self-remembering run — the last two Polsia primitives:
//   • runTrackedAgent — wraps agent-config.runAgent in an ai_kit_agent_runs
//     audit record (input context, output, duration, status, cost) and
//     emits an activity event. This is what powers a live dashboard feed.
//   • remember        — dual-writes an insight: to the activity feed
//     (structured, queryable) AND to pgvector 'memory' (semantic recall),
//     so agents accumulate memory across runs (Polsia's Postgres+Chroma).
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runAgent, type AgentDef, type TaskDef } from "./agent-config.ts";
import { upsertDocuments } from "./vector-search.ts";
import { memoryNamespace, renderContext, type HelixContext } from "./context.ts";
import { isSandbox } from "./sandbox.ts";

export type ActivityLevel = "info" | "success" | "warning" | "error";

export interface ActivityEvent {
  agent: string;
  action: string;
  summary: string;
  level?: ActivityLevel;
  product?: string;
  workspaceId?: string;
  userId?: string;
  ref?: Record<string, unknown>;
}

/** Append one event to the live activity feed (Realtime-published). */
export async function logActivity(sb: SupabaseClient, ev: ActivityEvent): Promise<void> {
  const { error } = await sb.from("ai_kit_activity").insert({
    agent: ev.agent,
    product: ev.product ?? null,
    action: ev.action,
    summary: ev.summary,
    level: ev.level ?? "info",
    ref: ev.ref ?? {},
    workspace_id: ev.workspaceId ?? null,
    user_id: ev.userId ?? null,
  });
  if (error) console.warn("logActivity failed (non-fatal):", error.message);
}

/**
 * Dual-write a durable insight: structured (activity feed, for the
 * dashboard + buildContext recentActivity) and semantic (pgvector
 * 'memory' namespace, for buildContext memory recall). Vector write is
 * best-effort so a missing embeddings key never breaks the run.
 */
export async function remember(
  sb: SupabaseClient,
  args: {
    agent: string;
    content: string;
    product?: string;
    workspaceId?: string;
    userId?: string;
    refId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await logActivity(sb, {
    agent: args.agent, action: "memory", summary: args.content,
    level: "info", product: args.product,
    workspaceId: args.workspaceId, userId: args.userId,
    ref: { refId: args.refId, ...args.metadata },
  });
  try {
    await upsertDocuments(sb, [{
      namespace: memoryNamespace(args.product), content: args.content,
      refId: args.refId, workspaceId: args.workspaceId, userId: args.userId,
      metadata: { agent: args.agent, product: args.product, ...(args.metadata ?? {}) },
    }]);
  } catch (e) {
    console.warn("remember: vector write skipped:", (e as Error).message);
  }
}

export interface TrackedRunParams {
  agent: AgentDef;
  task: TaskDef;
  product?: string;
  workspaceId?: string;
  userId?: string;
  /** Pre-built context; its renderContext() output is folded into the task. */
  context?: HelixContext;
}

export interface TrackedRunResult<T> {
  runId: string;
  output: T | null;
  status: "completed" | "failed";
  durationMs: number;
  error?: string;
}

/**
 * Run an agent with full audit + activity emission. Opens an
 * ai_kit_agent_runs row (running), executes, then closes it
 * (completed/failed) and logs one activity event. Never throws — the
 * failure is recorded and returned so a scheduler can move on.
 */
export async function runTrackedAgent<T = string>(
  sb: SupabaseClient,
  params: TrackedRunParams,
): Promise<TrackedRunResult<T>> {
  const inputContext = params.context
    ? { config: params.context.config, kpis: params.context.kpis }
    : {};

  const { data: runRow, error: insErr } = await sb
    .from("ai_kit_agent_runs")
    .insert({
      agent: params.agent.name,
      product: params.product ?? null,
      task: params.task.description.slice(0, 500),
      status: "running",
      input_context: inputContext,
      sandbox: isSandbox(),
      workspace_id: params.workspaceId ?? null,
      user_id: params.userId ?? null,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(`runTrackedAgent: could not open run — ${insErr.message}`);
  const runId = runRow.id as string;

  const started = performance.now();
  let status: "completed" | "failed" = "completed";
  let output: T | null = null;
  let error: string | undefined;

  try {
    // Fold context into the task so the agent reasons over the company brief.
    const task: TaskDef = params.context
      ? { ...params.task, context: [params.task.context, renderContext(params.context)].filter(Boolean).join("\n\n") }
      : params.task;
    const run = await runAgent<T>(params.agent, task);
    output = run.output;
  } catch (e) {
    status = "failed";
    error = (e as Error).message;
  }

  const durationMs = Math.round(performance.now() - started);

  await sb.from("ai_kit_agent_runs").update({
    status,
    output: output === null ? null : (typeof output === "string" ? { text: output } : output),
    error: error ?? null,
    duration_ms: durationMs,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);

  await logActivity(sb, {
    agent: params.agent.name,
    product: params.product,
    action: status === "completed" ? "task_completed" : "task_failed",
    summary: status === "completed"
      ? `${params.agent.name}: ${params.task.description.slice(0, 120)}`
      : (error ?? "run failed"),
    level: status === "completed" ? "success" : "error",
    workspaceId: params.workspaceId,
    userId: params.userId,
    ref: { runId },
  });

  return { runId, output, status, durationMs, error };
}
