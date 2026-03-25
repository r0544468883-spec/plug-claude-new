
-- Create promo_codes table to store codes securely in database
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'bonus',
  amount integer,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS - only service role can access
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- No client-side policies - only service role key can access this table
