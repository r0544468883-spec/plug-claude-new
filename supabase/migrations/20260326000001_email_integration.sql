-- ============================================
-- Email Integration: OAuth tokens, application emails, sync state
-- ============================================

-- 1. email_oauth_tokens — stores Gmail/Outlook OAuth credentials per user
CREATE TABLE IF NOT EXISTS public.email_oauth_tokens (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email_address TEXT NOT NULL,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE public.email_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email tokens"
  ON public.email_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email tokens"
  ON public.email_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email tokens"
  ON public.email_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email tokens"
  ON public.email_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 2. application_emails — emails linked to job applications
CREATE TABLE IF NOT EXISTS public.application_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_msg_id TEXT,
  thread_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  ai_classification TEXT CHECK (ai_classification IN (
    'interview_invitation', 'rejection', 'offer', 'task_assignment',
    'follow_up', 'general', 'acknowledgment', 'info_request'
  )),
  ai_confidence NUMERIC(3,2) DEFAULT 0.00 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_extracted_data JSONB DEFAULT '{}'::jsonb,
  auto_updated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.application_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own application emails"
  ON public.application_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application emails"
  ON public.application_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own application emails"
  ON public.application_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_application_emails_application ON public.application_emails(application_id);
CREATE INDEX idx_application_emails_user ON public.application_emails(user_id);
CREATE INDEX idx_application_emails_thread ON public.application_emails(thread_id);
CREATE INDEX idx_application_emails_provider_msg ON public.application_emails(provider_msg_id);

-- 3. email_sync_state — tracks sync progress per user
CREATE TABLE IF NOT EXISTS public.email_sync_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_history_id TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  emails_processed INTEGER DEFAULT 0,
  sync_errors INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.email_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync state"
  ON public.email_sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own sync state"
  ON public.email_sync_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync state"
  ON public.email_sync_state FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Add auto_send column to email_templates (for recruiter auto-send on stage change)
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS auto_send BOOLEAN DEFAULT false;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS trigger_stage TEXT;

-- 5. Grant access to authenticated users
GRANT ALL ON public.email_oauth_tokens TO authenticated;
GRANT ALL ON public.application_emails TO authenticated;
GRANT ALL ON public.email_sync_state TO authenticated;
