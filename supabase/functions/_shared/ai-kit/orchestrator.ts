// ============================================================
// HELIX AI Kit — Orchestrator
// Steals from: microsoft/autogen (GroupChat speaker-selection)
//
// Dynamic multi-agent turn-taking: instead of a fixed pipeline, a
// selector decides which agent speaks next based on the conversation so
// far. This is the "team of agents" pattern (Researcher/Maker/Critic/
// Orchestrator) with real back-and-forth — a critic can send work back
// to the maker until it's good. Terminates on a goal-met signal or maxTurns.
// ============================================================

import { llm } from "./llm-router.ts";
import { renderSystemPrompt, type AgentDef } from "./agent-config.ts";

export interface Turn { agent: string; content: string; }

export interface GroupChatOptions {
  agents: AgentDef[];
  task: string;
  maxTurns?: number;
  /** phrase an agent emits to signal the goal is met (default "TERMINATE") */
  terminateOn?: string;
  /** "round-robin" | "auto" (LLM picks next speaker) */
  selection?: "round-robin" | "auto";
  selectorModel?: string;
}

export interface GroupChatResult {
  transcript: Turn[];
  final: string;
  turns: number;
  terminated: boolean;
}

function transcriptText(t: Turn[]): string {
  return t.map((x) => `[${x.agent}]: ${x.content}`).join("\n\n");
}

async function pickNextSpeaker(
  agents: AgentDef[], transcript: Turn[], task: string, model: string,
): Promise<AgentDef> {
  const roster = agents.map((a) => `- ${a.name}: ${a.role} — ${a.goal}`).join("\n");
  const { text } = await llm({
    model, maxTokens: 20, temperature: 0,
    system: `You are the orchestrator of an agent team working on this task:\n${task}\n\nAgents:\n${roster}\n\nGiven the conversation, reply with ONLY the name of the agent who should speak next.`,
    messages: [{ role: "user", content: transcriptText(transcript) || "(no messages yet)" }],
  });
  const name = text.trim();
  return agents.find((a) => name.toLowerCase().includes(a.name.toLowerCase())) ?? agents[0];
}

async function speak(agent: AgentDef, transcript: Turn[], task: string): Promise<string> {
  const { text } = await llm({
    model: agent.model,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens ?? 800,
    system: renderSystemPrompt(agent),
    messages: [{
      role: "user",
      content: `Team task: ${task}\n\nConversation so far:\n${transcriptText(transcript) || "(you are first)"}\n\nContribute your part. If the task is fully complete and correct, end your message with TERMINATE.`,
    }],
    costTag: `groupchat:${agent.name}`,
  });
  return text;
}

/**
 * Run a group chat until an agent emits the terminate phrase or maxTurns
 * is reached. Returns the full transcript and the last substantive message.
 */
export async function groupChat(opts: GroupChatOptions): Promise<GroupChatResult> {
  const maxTurns = opts.maxTurns ?? 8;
  const terminateOn = opts.terminateOn ?? "TERMINATE";
  const selection = opts.selection ?? "auto";
  const selectorModel = opts.selectorModel ?? "anthropic/claude-haiku-4-5-20251001";
  const transcript: Turn[] = [];

  let terminated = false;
  let rr = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const agent = selection === "round-robin"
      ? opts.agents[rr++ % opts.agents.length]
      : await pickNextSpeaker(opts.agents, transcript, opts.task, selectorModel);

    const content = await speak(agent, transcript, opts.task);
    transcript.push({ agent: agent.name, content });

    if (content.includes(terminateOn)) { terminated = true; break; }
  }

  const final = (transcript[transcript.length - 1]?.content ?? "")
    .replace(new RegExp(terminateOn, "g"), "").trim();

  return { transcript, final, turns: transcript.length, terminated };
}
