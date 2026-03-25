-- Create interview_reminders table for scheduling interviews
CREATE TABLE public.interview_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  interview_date TIMESTAMP WITH TIME ZONE NOT NULL,
  interview_type TEXT DEFAULT 'general',
  location TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create application_timeline table for tracking all events
CREATE TABLE public.application_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'status_change', 'stage_change', 'note_added', 'interview_scheduled', 'created'
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_timeline ENABLE ROW LEVEL SECURITY;

-- RLS for interview_reminders - users can manage reminders for their own applications
CREATE POLICY "Users can view own interview reminders"
ON public.interview_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = interview_reminders.application_id
    AND applications.candidate_id = auth.uid()
  )
);

CREATE POLICY "Users can create interview reminders for own applications"
ON public.interview_reminders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = interview_reminders.application_id
    AND applications.candidate_id = auth.uid()
  )
);

CREATE POLICY "Users can update own interview reminders"
ON public.interview_reminders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = interview_reminders.application_id
    AND applications.candidate_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own interview reminders"
ON public.interview_reminders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = interview_reminders.application_id
    AND applications.candidate_id = auth.uid()
  )
);

-- RLS for application_timeline - users can view timeline for their own applications
CREATE POLICY "Users can view own application timeline"
ON public.application_timeline
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = application_timeline.application_id
    AND applications.candidate_id = auth.uid()
  )
);

CREATE POLICY "Users can add timeline events for own applications"
ON public.application_timeline
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = application_timeline.application_id
    AND applications.candidate_id = auth.uid()
  )
);

-- Create trigger for updated_at on interview_reminders
CREATE TRIGGER update_interview_reminders_updated_at
BEFORE UPDATE ON public.interview_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_interview_reminders_application_id ON public.interview_reminders(application_id);
CREATE INDEX idx_interview_reminders_date ON public.interview_reminders(interview_date);
CREATE INDEX idx_application_timeline_application_id ON public.application_timeline(application_id);
CREATE INDEX idx_application_timeline_created_at ON public.application_timeline(created_at DESC);