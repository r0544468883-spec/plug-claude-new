-- Add Foreign Key for shared_by_user_id to profiles
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_shared_by_user_id_fkey 
FOREIGN KEY (shared_by_user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;

-- Add visible_to_hr column to profiles
ALTER TABLE public.profiles
ADD COLUMN visible_to_hr BOOLEAN DEFAULT false;

-- Create saved_jobs table
CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable RLS on saved_jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_jobs
CREATE POLICY "Users can view own saved jobs"
ON public.saved_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
ON public.saved_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
ON public.saved_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Create job_alerts table
CREATE TABLE public.job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  field_ids UUID[] DEFAULT '{}',
  role_ids UUID[] DEFAULT '{}',
  experience_level_ids UUID[] DEFAULT '{}',
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on job_alerts
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_alerts
CREATE POLICY "Users can view own alerts"
ON public.job_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create alerts"
ON public.job_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
ON public.job_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
ON public.job_alerts FOR DELETE
USING (auth.uid() = user_id);