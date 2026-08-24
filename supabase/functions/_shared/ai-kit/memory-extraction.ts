// ============================================================
// HELIX AI Kit — Memory Extraction
// Steals from: mem0ai/mem0 (extract → dedup → update memory taxonomy)
//
// Turn a raw conversation/interaction into durable, structured memories
// (facts / preferences / relationships), dedup against what's already
// stored, and upsert. Gives every HELIX product long-term, per-user /
// per-workspace memory on top of the shared pgvector store — the
// "organizational memory across products" goal.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { structured, type Schema } from "./structured-output.ts";
import { search, upsertDocuments } from "./vector-search.ts";

export type MemoryType = "fact" | "preference" | "relationship";

export interface Memory {
  type: MemoryType;
  content: string;
  subject?: string;   // who/what the memory is about
}

const MEMORY_SCHEMA: Schema = {
  properties: {
    memories: {
      type: "array",
      required: true,
      items: {
        type: "object",
        properties: {
          type: { type: "string", required: true, enum: ["fact", "preference", "relationship"] },
          content: { type: "string", required: true },
          subject: { type: "string" },
        },
      },
    },
  },
};

/** Extract atomic memories from a chunk of conversation/text. */
export async function extractMemories(text: string): Promise<Memory[]> {
  const { data } = await structured<{ memories: Memory[] }>({
    system:
      "Extract durable memories worth remembering long-term. Classify each as " +
      "'fact' (stable truth about the user/entity), 'preference' (what they like/want/how they work), " +
      "or 'relationship' (link between entities). Ignore transient chatter. Be concise; one idea per memory.",
    messages: [{ role: "user", content: text }],
    maxTokens: 800,
    temperature: 0,
  }, MEMORY_SCHEMA);
  return data.memories ?? [];
}

/**
 * Extract, then dedup each candidate against existing memories in the same
 * namespace via vector similarity. Near-duplicates (>= threshold) are
 * skipped; genuinely new ones are embedded and stored. Returns count added.
 */
export async function rememberFrom(
  sb: SupabaseClient,
  text: string,
  scope: { namespace?: string; userId?: string; workspaceId?: string },
  opts: { dedupThreshold?: number } = {},
): Promise<{ added: Memory[]; skipped: number }> {
  const namespace = scope.namespace ?? "memory";
  const threshold = opts.dedupThreshold ?? 0.9;
  const candidates = await extractMemories(text);

  const added: Memory[] = [];
  let skipped = 0;

  for (const m of candidates) {
    const similar = await search(sb, namespace, m.content, {
      count: 1, minSimilarity: threshold, workspaceId: scope.workspaceId,
    });
    if (similar.length > 0) { skipped++; continue; } // already known
    await upsertDocuments(sb, [{
      namespace, content: m.content, userId: scope.userId, workspaceId: scope.workspaceId,
      metadata: { memory_type: m.type, subject: m.subject ?? null },
    }]);
    added.push(m);
  }
  return { added, skipped };
}

/** Recall the most relevant memories for a query (feed into a prompt). */
export async function recall(
  sb: SupabaseClient,
  query: string,
  scope: { namespace?: string; workspaceId?: string; count?: number },
): Promise<Memory[]> {
  const rows = await search(sb, scope.namespace ?? "memory", query, {
    count: scope.count ?? 6, workspaceId: scope.workspaceId,
  });
  return rows.map((r) => ({
    type: (r.metadata.memory_type as MemoryType) ?? "fact",
    content: r.content,
    subject: (r.metadata.subject as string) ?? undefined,
  }));
}
