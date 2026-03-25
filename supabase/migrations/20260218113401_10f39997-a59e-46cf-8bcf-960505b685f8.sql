
-- Calendar OAuth tokens for bidirectional sync
CREATE TABLE public.calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  calendar_id TEXT DEFAULT 'primary',
  webhook_channel_id TEXT,
  webhook_resource_id TEXT,
  webhook_expiration TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar tokens"
  ON public.calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar tokens"
  ON public.calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar tokens"
  ON public.calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar tokens"
  ON public.calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_calendar_tokens_updated_at
  BEFORE UPDATE ON public.calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calendar events mapping (local event ID <-> provider event ID)
CREATE TABLE public.calendar_event_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  local_activity_id UUID,
  provider_event_id TEXT NOT NULL,
  provider_calendar_id TEXT NOT NULL DEFAULT 'primary',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, provider_event_id)
);

ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar mappings"
  ON public.calendar_event_mappings FOR ALL
  USING (auth.uid() = user_id);
