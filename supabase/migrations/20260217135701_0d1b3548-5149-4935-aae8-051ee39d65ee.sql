
-- Client CRM tables for Hunters (recruiters)

-- Client contacts (stakeholders at companies)
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  role_title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage own client contacts"
  ON public.client_contacts FOR ALL
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Client timeline (activity log per company)
CREATE TABLE public.client_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'email', 'meeting', 'call', 'note', 'placement', 'contract', 'task_completed'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage own client timeline"
  ON public.client_timeline FOR ALL
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Client tasks (auto-generated or manual)
CREATE TABLE public.client_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'dismissed'
  due_date TIMESTAMPTZ,
  source TEXT DEFAULT 'manual', -- 'manual', 'ai_suggested', 'system'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage own client tasks"
  ON public.client_tasks FOR ALL
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Client vault (file storage metadata)
CREATE TABLE public.client_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT DEFAULT 'other', -- 'contract', 'job_spec', 'proposal', 'invoice', 'other'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage own client vault"
  ON public.client_vault FOR ALL
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Extend companies table with CRM fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'lead'; -- 'lead', 'active', 'cold'
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tech_stack TEXT[];
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS estimated_revenue NUMERIC DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS historical_value NUMERIC DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_scraped_url TEXT;

-- Storage bucket for client vault files
INSERT INTO storage.buckets (id, name, public) VALUES ('client-vault', 'client-vault', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Recruiters upload to client vault" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'client-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Recruiters read own client vault" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Recruiters delete own client vault" ON storage.objects
  FOR DELETE USING (bucket_id = 'client-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at
CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_tasks_updated_at
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
