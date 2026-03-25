-- Add portfolio AI summary to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS portfolio_summary JSONB DEFAULT '{}'::jsonb;

-- Add transparency metrics to profiles (candidate metrics)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS response_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS avg_response_time_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS total_applications INTEGER DEFAULT 0;

-- Add transparency metrics to companies (hiring metrics)
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS avg_hiring_speed_days NUMERIC,
  ADD COLUMN IF NOT EXISTS total_hires INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_metrics_update TIMESTAMPTZ;

-- Create interview_recordings storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('interview-recordings', 'interview-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for interview recordings - users can upload their own
CREATE POLICY "Users can upload own interview recordings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own interview recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own interview recordings"
ON storage.objects
FOR DELETE
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- HR can view candidate interview recordings for their applications
CREATE POLICY "HR can view candidate interview recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'interview-recordings' 
  AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id::text = (storage.foldername(name))[1]
      AND j.created_by = auth.uid()
  )
);