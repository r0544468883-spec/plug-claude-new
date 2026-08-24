-- ============================================================
-- HELIX AI Kit — supporting tables for checkpoint / queue / cache /
-- analytics / notifications. Postgres-backed defaults so the kit works
-- with zero external infra; adapters switch to Redis/trigger.dev/Novu/
-- PostHog when their env vars are set (no schema change needed then).
-- All tables service_role-only from the client (writes go via edge fns).
-- ============================================================

-- ── checkpoint.ts (langgraph pattern) ────────────────────────
create table if not exists public.ai_kit_checkpoints (
  run_id       text primary key,
  kind         text not null,
  status       text not null default 'running',   -- running|awaiting_approval|completed|failed
  step_index   int  not null default 0,
  state        jsonb not null default '{}'::jsonb,
  pending      jsonb,
  error        text,
  workspace_id uuid,
  user_id      uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists ai_kit_checkpoints_status_idx on public.ai_kit_checkpoints (status, kind);

-- ── queue.ts (trigger.dev fallback) ──────────────────────────
create table if not exists public.ai_kit_jobs (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending',    -- pending|running|done|failed
  attempts     int  not null default 0,
  max_attempts int  not null default 3,
  run_after    timestamptz not null default now(),
  dedupe_key   text,
  last_error   text,
  workspace_id uuid,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists ai_kit_jobs_due_idx on public.ai_kit_jobs (type, status, run_after);
create unique index if not exists ai_kit_jobs_dedupe_idx
  on public.ai_kit_jobs (dedupe_key) where status in ('pending','running') and dedupe_key is not null;

-- Atomically claim due jobs (SKIP LOCKED so concurrent workers don't collide).
create or replace function public.ai_kit_claim_jobs(p_type text, p_limit int default 5)
returns setof public.ai_kit_jobs
language plpgsql
as $$
begin
  return query
  update public.ai_kit_jobs j
     set status = 'running', attempts = attempts + 1
   where j.id in (
     select id from public.ai_kit_jobs
      where type = p_type and status = 'pending' and run_after <= now()
      order by run_after
      for update skip locked
      limit p_limit
   )
  returning j.*;
end;
$$;

create or replace function public.ai_kit_fail_job(p_id uuid, p_error text)
returns void
language plpgsql
as $$
begin
  update public.ai_kit_jobs
     set last_error = p_error,
         status = case when attempts >= max_attempts then 'failed' else 'pending' end,
         run_after = now() + (interval '1 minute' * power(2, attempts))
   where id = p_id;
end;
$$;

-- ── cache.ts (redis fallback) ────────────────────────────────
create table if not exists public.ai_kit_cache (
  key        text primary key,
  value      jsonb,
  counter    bigint,
  expires_at timestamptz
);
create index if not exists ai_kit_cache_expires_idx on public.ai_kit_cache (expires_at);

-- Atomic counter for rate limiting.
create or replace function public.ai_kit_cache_incr(p_key text, p_ttl_seconds int default null)
returns bigint
language plpgsql
as $$
declare v bigint;
begin
  insert into public.ai_kit_cache (key, counter, expires_at)
  values (p_key, 1, case when p_ttl_seconds is null then null else now() + (p_ttl_seconds || ' seconds')::interval end)
  on conflict (key) do update
    set counter = case
      when public.ai_kit_cache.expires_at is not null and public.ai_kit_cache.expires_at < now() then 1
      else coalesce(public.ai_kit_cache.counter, 0) + 1 end
  returning counter into v;
  return v;
end;
$$;

-- ── analytics.ts (posthog fallback + PIXEL spine) ────────────
create table if not exists public.ai_kit_events (
  id           bigint generated always as identity primary key,
  event        text not null,
  distinct_id  text not null,
  product      text,
  properties   jsonb not null default '{}'::jsonb,
  workspace_id uuid,
  created_at   timestamptz not null default now()
);
create index if not exists ai_kit_events_event_idx on public.ai_kit_events (event, created_at);
create index if not exists ai_kit_events_distinct_idx on public.ai_kit_events (distinct_id, created_at);
create index if not exists ai_kit_events_workspace_idx on public.ai_kit_events (workspace_id, created_at);

-- ── notifications.ts (novu fallback: in-app store) ───────────
create table if not exists public.ai_kit_notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  workspace_id uuid,
  event        text not null,
  payload      jsonb not null default '{}'::jsonb,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists ai_kit_notifications_user_idx on public.ai_kit_notifications (user_id, read, created_at);

-- ── RLS: lock all to service_role; users may read their own where relevant ──
alter table public.ai_kit_checkpoints   enable row level security;
alter table public.ai_kit_jobs          enable row level security;
alter table public.ai_kit_cache         enable row level security;
alter table public.ai_kit_events        enable row level security;
alter table public.ai_kit_notifications enable row level security;

-- Users can read their own in-app notifications; everything else is edge-only.
drop policy if exists "notif_select_own" on public.ai_kit_notifications;
create policy "notif_select_own" on public.ai_kit_notifications
  for select using (user_id = auth.uid());

drop policy if exists "notif_update_own" on public.ai_kit_notifications;
create policy "notif_update_own" on public.ai_kit_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No client-side access to internal tables (service_role bypasses RLS).
drop policy if exists "ck_none" on public.ai_kit_checkpoints;
create policy "ck_none" on public.ai_kit_checkpoints for all using (false) with check (false);
drop policy if exists "jobs_none" on public.ai_kit_jobs;
create policy "jobs_none" on public.ai_kit_jobs for all using (false) with check (false);
drop policy if exists "cache_none" on public.ai_kit_cache;
create policy "cache_none" on public.ai_kit_cache for all using (false) with check (false);
drop policy if exists "events_none" on public.ai_kit_events;
create policy "events_none" on public.ai_kit_events for all using (false) with check (false);
