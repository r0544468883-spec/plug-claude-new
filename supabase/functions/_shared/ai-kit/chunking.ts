// ============================================================
// HELIX AI Kit — Chunking
// Steals from: run-llama/llama_index (node-parsing strategies)
//
// How you split a document before embedding matters more than the vector
// DB. Ports llama_index's core strategies to dependency-free TS:
//  - "sentence": pack whole sentences up to a size, with overlap
//  - "paragraph": split on blank lines, merge small paragraphs
//  - "sentence-window": one sentence per chunk, ± window of context
//  - "markdown": split on headings, keep heading path as prefix
// RTL/Hebrew-safe (operates on Unicode, not byte offsets).
// ============================================================

export type ChunkStrategy = "sentence" | "paragraph" | "sentence-window" | "markdown";

export interface ChunkOptions {
  strategy?: ChunkStrategy;
  /** target chunk size in characters (not tokens; ~4 chars/token) */
  maxChars?: number;
  /** overlap in characters between adjacent chunks */
  overlapChars?: number;
  /** for sentence-window: sentences of context on each side */
  windowSize?: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  strategy: "sentence",
  maxChars: 1600,     // ~400 tokens
  overlapChars: 200,
  windowSize: 1,
};

// Sentence splitter handling ., !, ?, and Hebrew/Arabic full stops,
// without breaking on common abbreviations' trailing dots.
function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .match(/[^.!?׃…]+[.!?׃…]+|\S+$/g) ?? [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function packWithOverlap(units: string[], maxChars: number, overlapChars: number): string[] {
  const chunks: string[] = [];
  let cur = "";
  for (const u of units) {
    if (cur && (cur.length + 1 + u.length) > maxChars) {
      chunks.push(cur.trim());
      // start next chunk with a tail overlap of the previous one
      const tail = overlapChars > 0 ? cur.slice(Math.max(0, cur.length - overlapChars)) : "";
      cur = (tail ? tail + " " : "") + u;
    } else {
      cur = cur ? `${cur} ${u}` : u;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function chunkParagraph(text: string, o: Required<ChunkOptions>): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  return packWithOverlap(paras, o.maxChars, o.overlapChars);
}

function chunkSentence(text: string, o: Required<ChunkOptions>): string[] {
  return packWithOverlap(splitSentences(text), o.maxChars, o.overlapChars);
}

function chunkSentenceWindow(text: string, o: Required<ChunkOptions>): string[] {
  const sents = splitSentences(text);
  return sents.map((_, i) => {
    const from = Math.max(0, i - o.windowSize);
    const to = Math.min(sents.length, i + o.windowSize + 1);
    return sents.slice(from, to).join(" ");
  });
}

// Splits on markdown headings and prefixes each chunk with its heading
// path (e.g. "# Contract > ## Termination") so retrieved chunks keep
// structural context — the single most useful llama_index idea for
// long structured docs (contracts, JDs, transcripts).
function chunkMarkdown(text: string, o: Required<ChunkOptions>): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  const path: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (!body) { buf = []; return; }
    const prefix = path.length ? path.join(" > ") + "\n\n" : "";
    const combined = prefix + body;
    // further split oversized sections by sentence
    if (combined.length > o.maxChars) {
      for (const c of packWithOverlap(splitSentences(body), o.maxChars, o.overlapChars)) {
        out.push(prefix + c);
      }
    } else {
      out.push(combined);
    }
    buf = [];
  };

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      path.splice(level - 1);
      path[level - 1] = `${h[1]} ${h[2].trim()}`;
    } else {
      buf.push(line);
    }
  }
  flush();
  return out.filter(Boolean);
}

export function chunk(text: string, opts: ChunkOptions = {}): string[] {
  const o = { ...DEFAULTS, ...opts };
  const clean = (text ?? "").trim();
  if (!clean) return [];
  switch (o.strategy) {
    case "paragraph": return chunkParagraph(clean, o);
    case "sentence-window": return chunkSentenceWindow(clean, o);
    case "markdown": return chunkMarkdown(clean, o);
    case "sentence":
    default: return chunkSentence(clean, o);
  }
}
