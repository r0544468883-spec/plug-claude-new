-- Bump the advertised extension version so installed clients show the refresh
-- banner (they poll extension_config.latest_version every 30 min).
-- 1.2.6 adds the HELIX OPS engagement content scripts (Facebook/Instagram/LinkedIn).
INSERT INTO public.extension_config (key, value, updated_at)
VALUES ('latest_version', '1.2.6', now())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();
