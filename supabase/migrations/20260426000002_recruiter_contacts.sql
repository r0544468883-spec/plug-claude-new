-- Recruiter Contact Tracker: mini-CRM for job seekers to track recruiter interactions
CREATE TABLE IF NOT EXISTS public.recruiter_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'contacted'
    CHECK (status IN ('contacted', 'replied', 'meeting_scheduled', 'offer_received', 'cold')),
  notes TEXT,
  last_contact_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recruiter contacts"
  ON public.recruiter_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recruiter_contacts_user_idx ON public.recruiter_contacts(user_id, last_contact_at DESC);
