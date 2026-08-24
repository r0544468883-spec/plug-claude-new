// ============================================================
// HELIX AI Kit — Document → Markdown
// Adopts: microsoft/markitdown (any-doc → clean LLM-ready markdown)
//         docling pattern (layout-aware, for complex docs)
//
// Normalizes any input to clean Markdown before it hits an LLM — used by
// parse-resume, parse-jd, analyze-portfolio, Sign&Forms, MEETING.
// - text/html/markdown: converted inline, zero deps (clean-room).
// - binary (pdf/docx/xlsx/images): routed to a configurable converter
//   service (MARKITDOWN_URL) or the HELIX clean-room skills (helix-ocr,
//   helix-pdf). Never bundles markitdown's Python at runtime.
// ============================================================

export type SourceKind = "text" | "html" | "markdown" | "pdf" | "docx" | "xlsx" | "pptx" | "image" | "auto";

export interface ConvertInput {
  kind?: SourceKind;
  /** raw text for text/html/markdown; ignored for binary kinds */
  text?: string;
  /** base64 (no data: prefix) for binary kinds */
  base64?: string;
  mimeType?: string;
  filename?: string;
}

export interface ConvertResult {
  markdown: string;
  kind: SourceKind;
  via: "inline" | "service" | "unsupported";
}

const BINARY: SourceKind[] = ["pdf", "docx", "xlsx", "pptx", "image"];

function detectKind(input: ConvertInput): SourceKind {
  if (input.kind && input.kind !== "auto") return input.kind;
  const mt = (input.mimeType ?? "").toLowerCase();
  const name = (input.filename ?? "").toLowerCase();
  if (mt.includes("html") || /\.html?$/.test(name)) return "html";
  if (mt.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mt.includes("wordprocessing") || name.endsWith(".docx")) return "docx";
  if (mt.includes("spreadsheet") || name.endsWith(".xlsx")) return "xlsx";
  if (mt.includes("presentation") || name.endsWith(".pptx")) return "pptx";
  if (mt.startsWith("image/") || /\.(png|jpe?g|webp|tiff?)$/.test(name)) return "image";
  if (name.endsWith(".md")) return "markdown";
  return "text";
}

/** Minimal, dependency-free HTML → Markdown. Good enough for LLM ingestion. */
export function htmlToMarkdown(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(h1)[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $2\n")
       .replace(/<(h2)[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $2\n")
       .replace(/<(h3)[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $2\n")
       .replace(/<(h4|h5|h6)[^>]*>([\s\S]*?)<\/\1>/gi, "\n#### $2\n");
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
       .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  s = s.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  s = s.replace(/<(br)\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|table|ul|ol)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
       .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Convert any input to Markdown. Binary formats require MARKITDOWN_URL
 * (a self-hosted markitdown/docling microservice) — otherwise returns
 * `via: "unsupported"` so the caller can fall back to a HELIX skill.
 */
export async function toMarkdown(input: ConvertInput): Promise<ConvertResult> {
  const kind = detectKind(input);

  if (kind === "markdown") return { markdown: (input.text ?? "").trim(), kind, via: "inline" };
  if (kind === "text")     return { markdown: (input.text ?? "").trim(), kind, via: "inline" };
  if (kind === "html")     return { markdown: htmlToMarkdown(input.text ?? ""), kind, via: "inline" };

  if (BINARY.includes(kind)) {
    const serviceUrl = Deno.env.get("MARKITDOWN_URL");
    if (serviceUrl && input.base64) {
      const res = await fetch(serviceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, base64: input.base64, mimeType: input.mimeType, filename: input.filename }),
      });
      if (res.ok) {
        const data = await res.json();
        return { markdown: (data.markdown ?? "").trim(), kind, via: "service" };
      }
      console.warn(`markitdown service ${res.status}; falling back to unsupported`);
    }
    // No service configured — signal caller to use a clean-room HELIX skill
    // (helix-ocr for images, helix-pdf for PDFs) instead.
    return { markdown: "", kind, via: "unsupported" };
  }

  return { markdown: (input.text ?? "").trim(), kind: "text", via: "inline" };
}
