-- Create table for recruiter internal notes on candidates
CREATE TABLE public.recruiter_candidate_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recruiter_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recruiter_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.recruiter_candidate_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only recruiters can see/manage their own notes
CREATE POLICY "Recruiters can view own notes"
ON public.recruiter_candidate_notes
FOR SELECT
USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can create notes"
ON public.recruiter_candidate_notes
FOR INSERT
WITH CHECK (
  auth.uid() = recruiter_id 
  AND (has_role(auth.uid(), 'freelance_hr') OR has_role(auth.uid(), 'inhouse_hr'))
);

CREATE POLICY "Recruiters can update own notes"
ON public.recruiter_candidate_notes
FOR UPDATE
USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete own notes"
ON public.recruiter_candidate_notes
FOR DELETE
USING (auth.uid() = recruiter_id);

-- Add trigger for updated_at
CREATE TRIGGER update_recruiter_candidate_notes_updated_at
BEFORE UPDATE ON public.recruiter_candidate_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();