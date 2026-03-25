-- 3.6 Team Collaboration Notes
CREATE TABLE IF NOT EXISTS public.team_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;

-- Only HR/recruiters can manage team notes
CREATE POLICY "Recruiters can view team notes on their applications"
  ON public.team_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = team_notes.application_id
        AND (j.created_by = auth.uid() OR a.candidate_id = auth.uid())
    )
    OR mentioned_user_ids @> ARRAY[auth.uid()]
  );

CREATE POLICY "Recruiters can insert team notes"
  ON public.team_notes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('freelance_hr', 'inhouse_hr')
    )
  );

CREATE POLICY "Authors can update their own team notes"
  ON public.team_notes FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own team notes"
  ON public.team_notes FOR DELETE
  USING (auth.uid() = author_id);

CREATE TRIGGER update_team_notes_updated_at
  BEFORE UPDATE ON public.team_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3.8 GDPR: data deletion requests table
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own GDPR requests"
  ON public.gdpr_requests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
