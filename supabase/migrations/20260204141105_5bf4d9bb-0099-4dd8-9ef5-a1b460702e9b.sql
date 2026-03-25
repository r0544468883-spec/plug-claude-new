-- Create storage bucket for generated CVs if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-cvs', 'generated-cvs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload generated CVs to own folder" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'generated-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own CVs
CREATE POLICY "Users can read own generated CVs" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'generated-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read for generated CVs (for sharing)
CREATE POLICY "Generated CVs are publicly readable" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'generated-cvs');

-- Allow users to delete their own CVs
CREATE POLICY "Users can delete own generated CVs" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'generated-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);