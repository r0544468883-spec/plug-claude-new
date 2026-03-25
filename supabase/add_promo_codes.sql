-- Add promo codes - run in Supabase SQL Editor
-- This inserts the master unlimited promo code

INSERT INTO public.promo_codes (code_hash, is_active, type, amount, max_uses, expires_at)
VALUES (
  'Plugismybestfriend',  -- code stored as plaintext in code_hash column
  true,                  -- is_active
  'unlimited',           -- type: sets both daily_fuel and permanent_fuel to 999999
  0,                     -- amount (not used for unlimited type)
  NULL,                  -- max_uses: NULL = unlimited uses
  NULL                   -- expires_at: NULL = never expires
)
ON CONFLICT (code_hash) DO NOTHING;

-- Verify it was inserted
SELECT code_hash, is_active, type, uses_count, created_at
FROM public.promo_codes
WHERE code_hash = 'Plugismybestfriend';
