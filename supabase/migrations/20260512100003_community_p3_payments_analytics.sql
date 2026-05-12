-- ============================================================
-- PLUG Community Module — Phase 3: Payments, Analytics, Open Badges
-- ============================================================

-- ==================== PAYMENTS ====================

CREATE TABLE public.community_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.community_courses(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_payment_id TEXT,
  provider_session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Stripe/PayPal connect accounts for hub admins
CREATE TABLE public.community_payment_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  account_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== OPEN BADGES ====================

ALTER TABLE public.community_badges ADD COLUMN IF NOT EXISTS badge_class_url TEXT;
ALTER TABLE public.community_badges ADD COLUMN IF NOT EXISTS issuer_name TEXT DEFAULT 'PLUG';
ALTER TABLE public.community_badges ADD COLUMN IF NOT EXISTS issuer_url TEXT DEFAULT 'https://plug-nexus.ai';
ALTER TABLE public.community_badges ADD COLUMN IF NOT EXISTS criteria_url TEXT;
ALTER TABLE public.community_badges ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.community_badge_awards ADD COLUMN IF NOT EXISTS assertion_url TEXT;
ALTER TABLE public.community_badge_awards ADD COLUMN IF NOT EXISTS verification_hash TEXT;
ALTER TABLE public.community_badge_awards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ==================== ANALYTICS ====================

CREATE TABLE public.community_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Course generation log
CREATE TABLE public.community_ai_course_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  result JSONB,
  course_id UUID REFERENCES public.community_courses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== RLS ====================

ALTER TABLE public.community_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_ai_course_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.community_payments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage payments" ON public.community_payments
  FOR ALL USING (true);

CREATE POLICY "Hub admins can manage payment accounts" ON public.community_payment_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_payment_accounts.hub_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
  );
CREATE POLICY "Members can view payment accounts" ON public.community_payment_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_payment_accounts.hub_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Hub admins can view analytics" ON public.community_analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_analytics_events.hub_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
  );
CREATE POLICY "System can insert analytics" ON public.community_analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own AI logs" ON public.community_ai_course_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create AI logs" ON public.community_ai_course_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own AI logs" ON public.community_ai_course_logs
  FOR UPDATE USING (user_id = auth.uid());

-- ==================== INDEXES ====================

CREATE INDEX idx_community_payments_user ON public.community_payments(user_id);
CREATE INDEX idx_community_payments_course ON public.community_payments(course_id);
CREATE INDEX idx_community_payments_status ON public.community_payments(status);
CREATE INDEX idx_community_analytics_hub ON public.community_analytics_events(hub_id, event_type);
CREATE INDEX idx_community_analytics_created ON public.community_analytics_events(created_at);
CREATE INDEX idx_community_ai_logs_hub ON public.community_ai_course_logs(hub_id);
