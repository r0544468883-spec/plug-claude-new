
-- Feature 4.3: White Label additions
ALTER TABLE public.career_sites 
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS hide_plug_branding BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_font TEXT DEFAULT 'Heebo',
  ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- Feature 4.6: Onboarding Module (Post-Hire)
CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'ברירת מחדל',
  tasks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.onboarding_templates(id),
  new_hire_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  company_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.onboarding_instances(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(instance_id, task_index)
);

-- Feature 4.7: Webhooks
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  fail_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for onboarding tables
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Onboarding policies
CREATE POLICY "company_manages_templates" ON public.onboarding_templates 
  FOR ALL USING (auth.uid() = company_id);

CREATE POLICY "company_manages_instances" ON public.onboarding_instances 
  FOR ALL USING (auth.uid() = company_id);

CREATE POLICY "hire_views_own_instance" ON public.onboarding_instances 
  FOR SELECT USING (auth.uid() = new_hire_id);

CREATE POLICY "hire_updates_tasks" ON public.onboarding_task_progress 
  FOR ALL USING (
    instance_id IN (SELECT id FROM public.onboarding_instances WHERE new_hire_id = auth.uid())
    OR
    instance_id IN (SELECT id FROM public.onboarding_instances WHERE company_id = auth.uid())
  );

-- Webhook policies  
CREATE POLICY "users_manage_own_webhooks" ON public.webhook_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_webhook_logs" ON public.webhook_logs
  FOR SELECT USING (
    subscription_id IN (SELECT id FROM public.webhook_subscriptions WHERE user_id = auth.uid())
  );

-- Updated_at trigger for onboarding_instances
CREATE OR REPLACE FUNCTION public.update_onboarding_instance_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
