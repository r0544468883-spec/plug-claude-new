-- Extension config table for version checks and feature flags
CREATE TABLE IF NOT EXISTS public.extension_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.extension_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (extension needs it without auth)
CREATE POLICY "Anyone can read extension config"
  ON public.extension_config FOR SELECT USING (true);

-- Only service role can update (via edge functions or dashboard)
CREATE POLICY "Service role manages config"
  ON public.extension_config FOR ALL USING (auth.role() = 'service_role');

-- Seed the current version
INSERT INTO public.extension_config (key, value) VALUES ('latest_version', '1.1.0')
ON CONFLICT (key) DO NOTHING;
