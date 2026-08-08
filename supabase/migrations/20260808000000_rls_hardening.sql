-- ============================================================
-- RLS hardening — closes permissive (`true`) policies flagged by ClaudeGuard-IL
-- (scan 2026-08-07, see security/claudeguard-scan-2026-08-07.md).
-- Runs LAST (dated 2026-08-08), after every base migration, so all tables exist.
-- Each block is guarded by to_regclass so it is safe whether or not the base
-- migration has been applied yet (community_* / groop_features may be pending).
-- Idempotent: DROP POLICY IF EXISTS + CREATE. Re-running is safe.
--
-- Principle: the service_role (edge functions, webhooks, SECURITY DEFINER
-- functions) BYPASSES RLS — so "System"/"Service role" writes keep working after
-- we remove the client-facing `true` policy. Client write paths that are legit
-- (payments, notifications) are SCOPED, not dropped, so the app keeps working.
--
-- NOT touched (verified deliberate & low-risk public append):
--   referrals."Anyone can insert referral click", profile_views."Anyone can
--   record a profile view", career_site_analytics."Career site analytics
--   insertable by all", signing_document_audit (already TO authenticated).
-- False positives (no action): table "their" (parser artifact), promo_codes
--   (RLS enabled with no policy = deny-all = already secure).
-- ============================================================

-- 1) companies — INSERT was open to anon; scope to logged-in users.
do $$ begin
  if to_regclass('public.companies') is not null then
    drop policy if exists "companies_auth_insert" on public.companies;
    create policy "companies_auth_insert" on public.companies
      for insert to authenticated with check (true);
  end if;
end $$;

-- 2) master_skills — same: adding a custom skill requires an account.
do $$ begin
  if to_regclass('public.master_skills') is not null then
    drop policy if exists "Authenticated users can add custom skills" on public.master_skills;
    create policy "Authenticated users can add custom skills" on public.master_skills
      for insert to authenticated with check (true);
  end if;
end $$;

-- 3) audit_log — written by triggers / server only (0 client inserts).
--    Drop the open client policy; service role & SECURITY DEFINER still write.
do $$ begin
  if to_regclass('public.audit_log') is not null then
    drop policy if exists "System can insert audit log" on public.audit_log;
  end if;
end $$;

-- 4) notifications — a client can create a notification for ANY user (phishing).
--    Require an account (blocks anon spam); the app's ping flow is authenticated.
--    TODO (follow-up): scope to actor once the actor/recipient columns are settled.
do $$ begin
  if to_regclass('public.notifications') is not null then
    drop policy if exists "System can insert notifications" on public.notifications;
    create policy "System can insert notifications" on public.notifications
      for insert to authenticated with check (true);
  end if;
end $$;

-- 5) company_reviews — UPDATE was open to everyone (anyone could edit/approve any
--    review). Restrict to the review's own author; is_approved moderation stays
--    server-side (service role bypasses RLS).
do $$ begin
  if to_regclass('public.company_reviews') is not null then
    drop policy if exists "Service role can update is_approved" on public.company_reviews;
    drop policy if exists "Reviewers can update own review" on public.company_reviews;
    create policy "Reviewers can update own review" on public.company_reviews
      for update to authenticated
      using (reviewer_id = auth.uid())
      with check (reviewer_id = auth.uid());
  end if;
end $$;

-- 6) community_point_transactions — points are awarded by the SECURITY DEFINER
--    function award_community_points(); no client insert exists. Drop the open policy.
do $$ begin
  if to_regclass('public.community_point_transactions') is not null then
    drop policy if exists "System can insert points" on public.community_point_transactions;
  end if;
end $$;

-- 7) community_notifications — same as notifications: require an account.
do $$ begin
  if to_regclass('public.community_notifications') is not null then
    drop policy if exists "System can insert notifications" on public.community_notifications;
    create policy "System can insert notifications" on public.community_notifications
      for insert to authenticated with check (true);
  end if;
end $$;

-- 8) community_payments — "System can manage payments" FOR ALL USING(true) leaked
--    every user's payments AND let anyone write them. Replace with: users insert
--    only their OWN pending payment (the client flow), completion via edge function
--    (create-payment-session / webhook, service role). Own-read policy already exists.
do $$ begin
  if to_regclass('public.community_payments') is not null then
    drop policy if exists "System can manage payments" on public.community_payments;
    drop policy if exists "Users insert own pending payment" on public.community_payments;
    create policy "Users insert own pending payment" on public.community_payments
      for insert to authenticated
      with check (user_id = auth.uid() and status = 'pending');
  end if;
end $$;

-- 9) community_analytics_events — require an account to emit events.
do $$ begin
  if to_regclass('public.community_analytics_events') is not null then
    drop policy if exists "System can insert analytics" on public.community_analytics_events;
    create policy "System can insert analytics" on public.community_analytics_events
      for insert to authenticated with check (true);
  end if;
end $$;

-- 10) payment_link_transactions — a PUBLIC checkout (payer is anon, no account),
--     so anon INSERT must stay — but the open policy let a payer self-mark a
--     transaction 'completed' without paying. Force new rows to 'pending';
--     completion is written by the payment webhook (service role).
do $$ begin
  if to_regclass('public.payment_link_transactions') is not null then
    drop policy if exists "link_tx_insert" on public.payment_link_transactions;
    create policy "link_tx_insert" on public.payment_link_transactions
      for insert with check (status = 'pending');
  end if;
end $$;

-- 11) affiliate_conversions — conversions are attributed server-side; no client
--     insert exists. Drop the open policy (was: forge conversions → affiliate fraud).
do $$ begin
  if to_regclass('public.affiliate_conversions') is not null then
    drop policy if exists "conversions_insert" on public.affiliate_conversions;
  end if;
end $$;

-- 12) challenge_teams — creating a team requires an account.
do $$ begin
  if to_regclass('public.challenge_teams') is not null then
    drop policy if exists "challenge_teams_insert" on public.challenge_teams;
    create policy "challenge_teams_insert" on public.challenge_teams
      for insert to authenticated with check (true);
  end if;
end $$;

-- Verify after applying — expect no `true`/no-role INSERT/ALL policies on these:
-- select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies
--  where schemaname='public'
--    and tablename in ('companies','master_skills','audit_log','notifications',
--      'company_reviews','community_point_transactions','community_notifications',
--      'community_payments','community_analytics_events','payment_link_transactions',
--      'affiliate_conversions','challenge_teams')
--  order by tablename, policyname;
