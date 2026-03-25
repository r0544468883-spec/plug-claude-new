
-- Create client reminders table
CREATE TABLE public.client_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.client_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'both', -- 'email', 'in_app', 'both'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'dismissed'
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;

-- RLS: recruiters manage own reminders
CREATE POLICY "Recruiters manage own reminders"
  ON public.client_reminders
  FOR ALL
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Index for efficient querying of pending reminders
CREATE INDEX idx_client_reminders_pending ON public.client_reminders (remind_at, status) WHERE status = 'pending';
CREATE INDEX idx_client_reminders_recruiter ON public.client_reminders (recruiter_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_client_reminders_updated_at
  BEFORE UPDATE ON public.client_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
