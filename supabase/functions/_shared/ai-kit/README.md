# HELIX AI Kit

A shared toolkit for every HELIX product's AI needs, built by distilling the
best open-source repos into **dependency-light, Deno-edge-ready, Claude-first
TypeScript**. Import from any edge function; the Chrome extension reaches it
through `ai-proxy`.

```ts
import { llm, structured, searchHybrid, chunk, groupChat } from "../_shared/ai-kit/index.ts";
```

## Source → module map

| Module | Distilled from | Tier | What it gives you |
|---|---|---|---|
| `llm-router.ts` | **BerriAI/litellm** | 🟢 full | One call site for all LLMs: routing, fallback, retry, per-call cost. |
| `structured-output.ts` | **pydantic/pydantic-ai** | 🟢 full | JSON output validated against a schema, re-prompts until it conforms. |
| `embeddings.ts` | **pgvector** (+Voyage/OpenAI) | 🟢 full | 1536-dim embeddings via Voyage (default) or OpenAI. |
| `vector-search.ts` | **pgvector** + **qdrant** | 🟢 full | Upsert/index/search; dense + hybrid (RRF) retrieval. |
| `stream.ts` | **vercel/ai** | 🟢 full | SSE token streaming for chat UIs (AI-SDK-compatible shape). |
| `observability.ts` | **langfuse** | 🟢 full | Trace LLM calls (cost/latency/usage). No-op until keys set. |
| `doc-to-markdown.ts` | **microsoft/markitdown**, **docling** | 🟢 full | Any doc → clean LLM-ready markdown (inline + service routing). |
| `chunking.ts` | **run-llama/llama_index** | 🟡 part | sentence / paragraph / sentence-window / markdown splitters (RTL-safe). |
| `checkpoint.ts` | **langchain-ai/langgraph** | 🟡 part | Durable multi-step runs + human-approval gate → **Autonomy switch**. |
| `guardrails.ts` | **openai/openai-agents** | 🟡 part | Input/output guards (PII, injection, blocklist, policy) → OPS gray-path. |
| `orchestrator.ts` | **microsoft/autogen** | 🟡 part | GroupChat with dynamic speaker-selection (team of agents). |
| `agent-config.ts` | **crewAI** | 🟡 part | Declare agents as data (role/goal/backstory) + sequential crew. |
| `memory-extraction.ts` | **mem0ai/mem0** | 🟡 part | Extract→dedup→store facts/preferences/relationships; recall for prompts. |
| `cache.ts` | **redis/upstash** | 🔵 future | KV + rate-limit counters. Postgres default; Redis when configured. |
| `queue.ts` | **trigger.dev** | 🔵 future | Durable background jobs. Postgres default; trigger.dev when configured. |
| `notifications.ts` | **novuhq/novu** | 🔵 future | Multi-channel notify(). Reuses existing email fns; Novu when configured. |
| `analytics.ts` | **PostHog** | 🔵 future | Event capture (PIXEL data spine). Postgres default; PostHog forward opt-in. |

## Migrations

- `20260822000001_ai_kit_pgvector.sql` — vector store + `match_documents` / `match_documents_hybrid`.
- `20260822000002_ai_kit_infra.sql` — checkpoint / jobs / cache / events / notifications tables + helper functions.

Run both in Supabase before using vector-search, checkpoint, queue, cache, or analytics.

## Environment variables

All optional except an LLM key. Unset vars mean the relevant module runs in
its Postgres/no-op default.

| Var | Enables |
|---|---|
| `CLAUDE_API_KEY` / `ANTHROPIC_API_KEY` | LLM calls (required) |
| `OPENAI_API_KEY` | OpenAI fallback + embeddings fallback |
| `VOYAGE_API_KEY` | Voyage embeddings (default embed provider) |
| `HELIX_EMBED_MODEL` | override embed model (default `voyage-3-lite`) |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | LLM tracing |
| `MARKITDOWN_URL` | binary-doc → markdown microservice |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Redis-backed cache |
| `TRIGGER_API_URL` / `TRIGGER_API_KEY` | trigger.dev queue |
| `NOVU_API_KEY` | Novu notifications |
| `POSTHOG_KEY` | forward analytics to PostHog |

## Design rules (why these choices)

1. **Claude-first.** Every generation defaults to Claude; other providers only
   for capabilities Anthropic lacks (embeddings) or explicit fallback.
2. **Clean-room / license-safe.** No AGPL/GPL code is bundled. Binary-doc
   parsing and scraping route to the existing HELIX clean-room skills
   (`helix-ocr`, `helix-pdf`, `helix-scraping`) rather than firecrawl/documenso.
3. **Zero-infra defaults.** Everything works today on Supabase alone; the 🔵
   modules upgrade to Redis/trigger.dev/Novu/PostHog by setting env vars — no
   code change at the call site.
4. **Edge-safe.** No Node built-ins; avoids `Date.now()`/`Math.random()` in
   resumable logic (isolated where unavoidable).
