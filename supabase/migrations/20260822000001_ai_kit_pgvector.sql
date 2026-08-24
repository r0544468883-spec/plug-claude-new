-- ============================================================
-- HELIX AI Kit — pgvector + hybrid search foundation
-- Adopts: pgvector (vector storage) + qdrant pattern (hybrid dense+sparse)
-- Shared across all HELIX products: PLUG (jobs/candidates), MEETING
-- (transcripts), Sign&Forms (contracts), Rank (citations), CRM, PIXEL.
-- ============================================================

create extension if not exists vector;

-- Generic embedding store. `namespace` partitions by product/domain
-- (e.g. 'jobs', 'candidates', 'meeting_transcript', 'contract', 'memory').
-- `ref_id` links back to the owning row in its source table.
-- 1536 dims = OpenAI text-embedding-3-small / Voyage voyage-3-lite.
-- Bump/vary per model via the `model` column (readers re-embed when stale).
create table if not exists public.document_embeddings (
  id           uuid primary key default gen_random_uuid(),
  namespace    text        not null,
  ref_id       text,
  workspace_id uuid,
  user_id      uuid,
  content      text        not null,
  embedding    vector(1536),
  -- generated full-text vector for the "sparse" half of hybrid search
  content_tsv  tsvector generated always as (to_tsvector('simple', coalesce(content, ''))) stored,
  metadata     jsonb       not null default '{}'::jsonb,
  model        text        not null default 'voyage-3-lite',
  created_at   timestamptz not null default now()
);

-- Approximate NN index (cosine). Lists tuned for small/medium corpora;
-- raise to rows/1000 once a namespace grows past ~100k rows.
create index if not exists document_embeddings_embedding_idx
  on public.document_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists document_embeddings_tsv_idx
  on public.document_embeddings using gin (content_tsv);

create index if not exists document_embeddings_namespace_idx
  on public.document_embeddings (namespace, ref_id);

create index if not exists document_embeddings_workspace_idx
  on public.document_embeddings (workspace_id);

-- ── Dense (vector-only) match ────────────────────────────────
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_namespace text,
  match_count     int   default 8,
  min_similarity  float default 0.0,
  filter_workspace uuid default null
)
returns table (
  id         uuid,
  ref_id     text,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.ref_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.document_embeddings e
  where e.namespace = match_namespace
    and (filter_workspace is null or e.workspace_id = filter_workspace)
    and e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) >= min_similarity
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Hybrid match (qdrant pattern): Reciprocal Rank Fusion of
--    dense vector similarity + sparse full-text rank. Beats either
--    alone for names/IDs/rare terms (job titles, company names, skills).
create or replace function public.match_documents_hybrid(
  query_embedding  vector(1536),
  query_text       text,
  match_namespace  text,
  match_count      int   default 8,
  rrf_k            int   default 50,
  filter_workspace uuid  default null
)
returns table (
  id       uuid,
  ref_id   text,
  content  text,
  metadata jsonb,
  score    float
)
language sql stable
as $$
  with dense as (
    select e.id,
           row_number() over (order by e.embedding <=> query_embedding) as rank
    from public.document_embeddings e
    where e.namespace = match_namespace
      and (filter_workspace is null or e.workspace_id = filter_workspace)
      and e.embedding is not null
    order by e.embedding <=> query_embedding
    limit match_count * 4
  ),
  sparse as (
    select e.id,
           row_number() over (
             order by ts_rank_cd(e.content_tsv, plainto_tsquery('simple', query_text)) desc
           ) as rank
    from public.document_embeddings e
    where e.namespace = match_namespace
      and (filter_workspace is null or e.workspace_id = filter_workspace)
      and e.content_tsv @@ plainto_tsquery('simple', query_text)
    limit match_count * 4
  ),
  fused as (
    select coalesce(d.id, s.id) as id,
           coalesce(1.0 / (rrf_k + d.rank), 0.0) +
           coalesce(1.0 / (rrf_k + s.rank), 0.0) as score
    from dense d
    full outer join sparse s on d.id = s.id
  )
  select e.id, e.ref_id, e.content, e.metadata, f.score
  from fused f
  join public.document_embeddings e on e.id = f.id
  order by f.score desc
  limit match_count;
$$;

-- ── RLS: workspace/user isolation; service_role bypasses for edge fns ──
alter table public.document_embeddings enable row level security;

drop policy if exists "embeddings_select_own" on public.document_embeddings;
create policy "embeddings_select_own"
  on public.document_embeddings for select
  using (
    user_id = auth.uid()
    or workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

-- Writes go through edge functions (service_role), never the client.
drop policy if exists "embeddings_no_client_write" on public.document_embeddings;
create policy "embeddings_no_client_write"
  on public.document_embeddings for all
  using (false) with check (false);

comment on table public.document_embeddings is
  'HELIX AI Kit shared vector store. Written only by edge functions (service_role). Query via match_documents / match_documents_hybrid.';
