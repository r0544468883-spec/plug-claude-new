-- Create table to track promo code redemptions
CREATE TABLE public.promo_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- Enable RLS
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own redemptions
CREATE POLICY "Users can view their own redemptions"
ON public.promo_code_redemptions
FOR SELECT
USING (auth.uid() = user_id);

-- No direct inserts from client - only through edge function
CREATE POLICY "No direct client inserts"
ON public.promo_code_redemptions
FOR INSERT
WITH CHECK (false);

-- Add index for faster lookups
CREATE INDEX idx_promo_redemptions_user_code ON public.promo_code_redemptions(user_id, code);