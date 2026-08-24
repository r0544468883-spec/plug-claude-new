// ============================================================
// HELIX AI Kit — Embeddings
// Adopts: pgvector (storage) — embedding generation routed via
// llm-router. Default provider Voyage (Anthropic's recommended
// embeddings partner); OpenAI fallback. 1536-dim to match the
// document_embeddings table.
// ============================================================

const EMBED_MODEL = Deno.env.get("HELIX_EMBED_MODEL") ?? "voyage-3-lite";
const EMBED_DIM = 1536;

/** Embed one or many texts. Returns vectors aligned to input order. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const voyageKey = Deno.env.get("VOYAGE_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (EMBED_MODEL.startsWith("voyage") && voyageKey) {
    return embedVoyage(texts, voyageKey);
  }
  if (openaiKey) {
    return embedOpenAi(texts, openaiKey);
  }
  throw new Error("embeddings: set VOYAGE_API_KEY or OPENAI_API_KEY");
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}

async function embedVoyage(texts: string[], key: string): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL, output_dimension: EMBED_DIM }),
  });
  if (!res.ok) throw new Error(`Voyage embeddings ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

async function embedOpenAi(texts: string[], key: string): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: texts, model: "text-embedding-3-small", dimensions: EMBED_DIM }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

export { EMBED_MODEL, EMBED_DIM };
