-- Fix: Message attachments viewable by all authenticated users
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view their message attachments" ON storage.objects;

-- Create a secure policy that checks conversation participation
-- Files are stored as: {user_id}/{timestamp}.{ext}
-- The foldername is the uploader's user_id
CREATE POLICY "Users can view message attachments for their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    -- User uploaded the file (they are the sender)
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User has a conversation with the uploader (they could be a recipient)
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (
        (c.participant_1 = auth.uid() AND c.participant_2::text = (storage.foldername(name))[1])
        OR
        (c.participant_2 = auth.uid() AND c.participant_1::text = (storage.foldername(name))[1])
      )
    )
  )
);