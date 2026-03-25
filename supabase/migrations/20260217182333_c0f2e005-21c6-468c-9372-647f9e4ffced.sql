
-- Add session_id to chat_history to group messages into conversations
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS session_id uuid DEFAULT gen_random_uuid();

-- Add title column for conversation preview
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS session_title text;

-- Create index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON public.chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON public.chat_history(user_id, session_id, created_at);
