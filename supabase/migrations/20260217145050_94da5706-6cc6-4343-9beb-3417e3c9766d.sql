
-- Add contact_id to client_timeline so events can be linked to specific contacts
ALTER TABLE public.client_timeline ADD COLUMN contact_id uuid REFERENCES public.client_contacts(id) ON DELETE SET NULL;

-- Create junction table linking contacts to jobs/projects
CREATE TABLE public.client_contact_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.client_contacts(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id uuid NOT NULL,
  role_in_project text DEFAULT 'stakeholder',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(contact_id, job_id)
);

-- Enable RLS
ALTER TABLE public.client_contact_projects ENABLE ROW LEVEL SECURITY;

-- RLS: Recruiters manage their own contact-project links
CREATE POLICY "Recruiters manage own contact projects"
  ON public.client_contact_projects
  FOR ALL
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Index for faster lookups
CREATE INDEX idx_client_timeline_contact ON public.client_timeline(contact_id);
CREATE INDEX idx_contact_projects_company ON public.client_contact_projects(company_id);
CREATE INDEX idx_contact_projects_contact ON public.client_contact_projects(contact_id);
CREATE INDEX idx_contact_projects_job ON public.client_contact_projects(job_id);
