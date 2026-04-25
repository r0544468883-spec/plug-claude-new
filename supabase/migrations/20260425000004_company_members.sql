-- Company Members — employees and HR contacts linked to companies
CREATE TABLE IF NOT EXISTS public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'hr', 'admin')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_members_company ON public.company_members(company_id);
CREATE INDEX idx_company_members_user ON public.company_members(user_id);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "company_members_read" ON public.company_members
  FOR SELECT USING (true);

-- Users can add/remove themselves
CREATE POLICY "company_members_self_manage" ON public.company_members
  FOR ALL USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
