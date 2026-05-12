-- ============================================================
-- PLUG Screen Recordings — Loom-style recording feature
-- ============================================================

CREATE TABLE public.screen_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  title_he TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration INT DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'screen',
  trim_start NUMERIC(10,3) DEFAULT 0,
  trim_end NUMERIC(10,3),
  annotations JSONB DEFAULT '[]',
  is_public BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  hub_id UUID REFERENCES public.community_hubs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.screen_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings" ON public.screen_recordings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view public recordings" ON public.screen_recordings
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create recordings" ON public.screen_recordings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recordings" ON public.screen_recordings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recordings" ON public.screen_recordings
  FOR DELETE USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_screen_recordings_user ON public.screen_recordings(user_id);
CREATE INDEX idx_screen_recordings_hub ON public.screen_recordings(hub_id);
CREATE INDEX idx_screen_recordings_public ON public.screen_recordings(is_public) WHERE is_public = true;

-- Storage bucket (run separately in Supabase Dashboard if needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings' AND (storage.foldername(name))[1] = 'recordings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can read public recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings');
