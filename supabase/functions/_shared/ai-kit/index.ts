// ============================================================
// HELIX AI Kit — barrel export
// One import surface for every edge function (and the extension via
// ai-proxy). Each module distills a best-in-class open-source repo into
// dependency-light, Deno-edge-ready, Claude-first TypeScript.
// See README.md for the source→module map and usage snippets.
// ============================================================

// 🟢 Full adoptions
export * from "./llm-router.ts";        // litellm
export * from "./structured-output.ts"; // pydantic-ai
export * from "./embeddings.ts";        // pgvector (gen)
export * from "./vector-search.ts";     // pgvector + qdrant hybrid
export * from "./stream.ts";            // vercel/ai
export * from "./observability.ts";     // langfuse
export * from "./doc-to-markdown.ts";   // markitdown / docling

// 🟡 Stolen parts
export * from "./chunking.ts";          // llama_index
export * from "./checkpoint.ts";        // langgraph
export * from "./guardrails.ts";        // openai-agents
export * from "./orchestrator.ts";      // autogen
export * from "./agent-config.ts";      // crewai
export * from "./memory-extraction.ts"; // mem0

// 🔵 Future infra (no-op / Postgres-backed until env configured)
export * from "./cache.ts";             // redis / upstash
export * from "./queue.ts";             // trigger.dev
export * from "./notifications.ts";     // novu
export * from "./analytics.ts";         // posthog (+ PIXEL spine)
