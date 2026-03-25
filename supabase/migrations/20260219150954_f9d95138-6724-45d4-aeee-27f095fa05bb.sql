
-- Add file upload fields to signing_documents
ALTER TABLE public.signing_documents
  ADD COLUMN IF NOT EXISTS original_file_url TEXT,
  ADD COLUMN IF NOT EXISTS original_file_name TEXT,
  ADD COLUMN IF NOT EXISTS original_file_type TEXT; -- 'pdf' | 'docx' | 'image'

-- Create storage bucket for signing documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('signing-documents', 'signing-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for signing-documents bucket
CREATE POLICY "Authenticated users can upload signing documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signing-documents');

CREATE POLICY "Users can view signing documents they created"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'signing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their signing documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'signing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
