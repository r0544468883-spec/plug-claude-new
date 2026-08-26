-- ============================================================
-- HELIX AI Kit — Agent Runtime tables
-- The 4 engineering primitives distilled from the Polsia teardown:
--   • ai_kit_agent_runs — per-run audit (input context, output, duration,
--     cost, status). The "agent_run audit table".
--   • ai_kit_activity   — append-only live activity feed. Realtime-published
--     so a dashboard can stream what agents do (their headline feature).
--   • ai_kit_context    — one row per (workspace, product): the company
--     brief + live KPIs that every agent receives via get_full_context.
-- Writes go through edge functions (service_role, bypasses RLS). The
-- owner may read their own runs/activity so the dashboard can subscribe.
-- ============================================================

-- ── agent_runtime.ts → ai_kit_agent_runs (audit) ─────────────
create table if not exists public.ai_kit_agent_runs (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null,                       -- e.g. "ads_management"
  product       text,                                -- helix product slug
  task          text,                                -- human title of the task
  status        text not null default 'running',     -- running|completed|failed
  input_context jsonb not null default '{}'::jsonb,   -- what the agent was given
  output        jsonb,                               -- what it produced
  error         text,
  duration_ms   int,
  cost_usd      numeric(10,6),
  sandbox       boolean not null default false,      -- was this a dry-run?
  workspace_id  uuid,
  user_id       uuid,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists ai_kit_agent_runs_agent_idx     on public.ai_kit_agent_runs (agent, created_at desc);
create index if not exists ai_kit_agent_runs_workspace_idx on public.ai_kit_agent_runs (workspace_id, created_at desc);
create index if not exists ai_kit_agent_runs_user_idx      on public.ai_kit_agent_runs (user_id, created_at desc);

-- ── agent_runtime.ts → ai_kit_activity (live feed) ───────────
create table if not exists public.ai_kit_activity (
  id           bigint generated always as identity primary key,
  agent        text not null,
  product      text,
  action       text not null,                        -- task_completed|insight|memory|...
  summary      text not null,
  level        text not null default 'info',         -- info|success|warning|error
  ref          jsonb not null default '{}'::jsonb,    -- {run_id, entity_id, url, ...}
  workspace_id uuid,
  user_id      uuid,
  created_at   timestamptz not null default now()
);
create index if not exists ai_kit_activity_workspace_idx on public.ai_kit_activity (workspace_id, created_at desc);
create index if not exists ai_kit_activity_user_idx      on public.ai_kit_activity (user_id, created_at desc);

-- Realtime payloads need the full row.
alter table public.ai_kit_activity replica identity full;

-- Publish the activity feed to Supabase Realtime (idempotent).
do $$
begin
  alter publication supabase_realtime add table public.ai_kit_activity;
exception
  when duplicate_object then null;
  when undefined_object then null;  -- publication not present in some local stacks
end $$;

-- ── context.ts → ai_kit_context (the "company brief") ────────
create table if not exists public.ai_kit_context (
  workspace_id uuid not null,
  product      text not null default '_default',
  config       jsonb not null default '{}'::jsonb,    -- mission, value_prop, pricing, goals, voice...
  kpis         jsonb not null default '{}'::jsonb,    -- mrr, active_users, churn, cac, ltv, nps...
  user_id      uuid,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, product)
);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.ai_kit_agent_runs enable row level security;
alter table public.ai_kit_activity   enable row level security;
alter table public.ai_kit_context    enable row level security;

-- Owner may read their own runs (dashboard drill-down). Writes are edge-only.
drop policy if exists "runs_select_own" on public.ai_kit_agent_runs;
create policy "runs_select_own" on public.ai_kit_agent_runs
  for select using (user_id = auth.uid());

-- Owner may read + subscribe to their own activity stream.
drop policy if exists "activity_select_own" on public.ai_kit_activity;
create policy "activity_select_own" on public.ai_kit_activity
  for select using (user_id = auth.uid());

-- Owner may read their own company context.
drop policy if exists "context_select_own" on public.ai_kit_context;
create policy "context_select_own" on public.ai_kit_context
  for select using (user_id = auth.uid());
