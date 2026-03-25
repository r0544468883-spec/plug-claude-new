
-- Add recipient fields to signing_documents
ALTER TABLE public.signing_documents
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS send_channel TEXT DEFAULT 'plug'; -- 'plug' | 'email' | 'whatsapp'
