-- Drop existing policies and recreate to allow token-based public signing
DROP POLICY IF EXISTS "Public signing token access" ON public.signing_documents;
DROP POLICY IF EXISTS "Public signing by token" ON public.signing_documents;

CREATE POLICY "Public signing token access" 
ON public.signing_documents FOR SELECT 
USING (signing_token IS NOT NULL);

CREATE POLICY "Public signing by token"
ON public.signing_documents FOR UPDATE
USING (signing_token IS NOT NULL AND status IN ('sent', 'viewed'));
