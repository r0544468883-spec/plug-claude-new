-- Add delivered_at + read_at timestamps to messages for full read receipts
-- sent = created_at (already exists)
-- delivered = delivered_at (set when recipient's client receives the realtime event)
-- read = is_read=true + read_at (set when recipient opens the conversation)

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL;

-- Backfill: for existing read messages, set read_at = created_at as a reasonable default
UPDATE public.messages
SET read_at = created_at
WHERE is_read = true AND read_at IS NULL;

-- Backfill: delivered_at = created_at for already-read messages (they must have been delivered)
UPDATE public.messages
SET delivered_at = created_at
WHERE is_read = true AND delivered_at IS NULL;

-- Index for faster lookups of undelivered messages per user
CREATE INDEX IF NOT EXISTS idx_messages_to_user_undelivered
  ON public.messages (to_user_id)
  WHERE delivered_at IS NULL;
