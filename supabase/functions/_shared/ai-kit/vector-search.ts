// ============================================================
// HELIX AI Kit — Vector Search
// Adopts: pgvector (dense) + qdrant pattern (hybrid dense+sparse RRF)
//
// Thin client over the SQL functions from
// 20260822000001_ai_kit_pgvector.sql. Handles embedding, upsert, and
// both dense and hybrid retrieval. Namespaces partition by domain:
// 'jobs' | 'candidates' | 'meeting_transcript' | 'contract' | 'memory' | ...
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embed, embedOne, EMBED_MODEL } from "./embeddings.ts";
import { chunk, type ChunkOptions } from "./chunking.ts";

export interface UpsertDoc {
  namespace: string;
  refId?: string;
  content: string;
  workspaceId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface Match {
  id: string;
  refId: string | null;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

/** Embed + insert one or many documents into the shared store. */
export async function upsertDocuments(sb: SupabaseClient, docs: UpsertDoc[]): Promise<number> {
  if (docs.length === 0) return 0;
  const vectors = await embed(docs.map((d) => d.content));
  const rows = docs.map((d, i) => ({
    namespace: d.namespace,
    ref_id: d.refId ?? null,
    workspace_id: d.workspaceId ?? null,
    user_id: d.userId ?? null,
    content: d.content,
    embedding: vectors[i],
    metadata: d.metadata ?? {},
    model: EMBED_MODEL,
  }));
  const { error } = await sb.from("document_embeddings").insert(rows);
  if (error) throw new Error(`upsertDocuments: ${error.message}`);
  return rows.length;
}

/**
 * Chunk a long document, then embed+store every chunk under one refId.
 * Replaces any prior chunks for that (namespace, refId) first.
 */
export async function indexDocument(
  sb: SupabaseClient,
  doc: Omit<UpsertDoc, "content"> & { content: string },
  opts?: ChunkOptions,
): Promise<number> {
  if (doc.refId) {
    await sb.from("document_embeddings")
      .delete().eq("namespace", doc.namespace).eq("ref_id", doc.refId);
  }
  const chunks = chunk(doc.content, opts);
  return upsertDocuments(sb, chunks.map((c, i) => ({
    ...doc,
    content: c,
    metadata: { ...(doc.metadata ?? {}), chunk_index: i, chunk_count: chunks.length },
  })));
}

/** Dense (pure vector) similarity search. */
export async function search(
  sb: SupabaseClient,
  namespace: string,
  query: string,
  opts: { count?: number; minSimilarity?: number; workspaceId?: string } = {},
): Promise<Match[]> {
  const queryEmbedding = await embedOne(query);
  const { data, error } = await sb.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_namespace: namespace,
    match_count: opts.count ?? 8,
    min_similarity: opts.minSimilarity ?? 0,
    filter_workspace: opts.workspaceId ?? null,
  });
  if (error) throw new Error(`search: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, refId: r.ref_id as string | null,
    content: r.content as string, metadata: r.metadata as Record<string, unknown>,
    score: r.similarity as number,
  }));
}

/**
 * Hybrid search (qdrant pattern): fuses vector similarity with Postgres
 * full-text via Reciprocal Rank Fusion. Use for queries with names, IDs,
 * skills, or rare terms where pure-vector under-recalls.
 */
export async function searchHybrid(
  sb: SupabaseClient,
  namespace: string,
  query: string,
  opts: { count?: number; workspaceId?: string } = {},
): Promise<Match[]> {
  const queryEmbedding = await embedOne(query);
  const { data, error } = await sb.rpc("match_documents_hybrid", {
    query_embedding: queryEmbedding,
    query_text: query,
    match_namespace: namespace,
    match_count: opts.count ?? 8,
    filter_workspace: opts.workspaceId ?? null,
  });
  if (error) throw new Error(`searchHybrid: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, refId: r.ref_id as string | null,
    content: r.content as string, metadata: r.metadata as Record<string, unknown>,
    score: r.score as number,
  }));
}
