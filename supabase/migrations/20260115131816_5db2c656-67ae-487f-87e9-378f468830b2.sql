-- Create storage bucket for home assignments
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-assignments', 'home-assignments', false);

-- Create home_assignments table
CREATE TABLE public.home_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for home_assignments
CREATE POLICY "Users can view own home assignments"
ON public.home_assignments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM applications
  WHERE applications.id = home_assignments.application_id
  AND applications.candidate_id = auth.uid()
));

CREATE POLICY "Users can create home assignments for own applications"
ON public.home_assignments
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM applications
  WHERE applications.id = home_assignments.application_id
  AND applications.candidate_id = auth.uid()
));

CREATE POLICY "Users can delete own home assignments"
ON public.home_assignments
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM applications
  WHERE applications.id = home_assignments.application_id
  AND applications.candidate_id = auth.uid()
));

-- Storage policies for home-assignments bucket
CREATE POLICY "Users can upload home assignment files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'home-assignments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own home assignment files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'home-assignments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own home assignment files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'home-assignments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Index for performance
CREATE INDEX idx_home_assignments_application_id ON public.home_assignments(application_id);