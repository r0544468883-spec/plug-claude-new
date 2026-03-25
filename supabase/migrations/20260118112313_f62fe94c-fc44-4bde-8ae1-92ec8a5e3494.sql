-- Create vouch_type enum
CREATE TYPE public.vouch_type AS ENUM ('colleague', 'manager', 'recruiter', 'friend', 'mentor');

-- Create vouches table for endorsements
CREATE TABLE public.vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  vouch_type public.vouch_type NOT NULL,
  relationship TEXT,
  message TEXT NOT NULL,
  skills TEXT[],
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT vouch_different_users CHECK (from_user_id != to_user_id)
);

-- Enable RLS
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;

-- Anyone can view public vouches
CREATE POLICY "Anyone can view public vouches" ON public.vouches
  FOR SELECT USING (is_public = true);

-- Users can view their own received vouches (even private)
CREATE POLICY "Users can view their received vouches" ON public.vouches
  FOR SELECT USING (auth.uid() = to_user_id);

-- Users can view vouches they gave
CREATE POLICY "Users can view their given vouches" ON public.vouches
  FOR SELECT USING (auth.uid() = from_user_id);

-- Authenticated users can create vouches
CREATE POLICY "Users can create vouches" ON public.vouches
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can update their own vouches
CREATE POLICY "Users can update their vouches" ON public.vouches
  FOR UPDATE USING (auth.uid() = from_user_id);

-- Users can delete their own vouches
CREATE POLICY "Users can delete their vouches" ON public.vouches
  FOR DELETE USING (auth.uid() = from_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vouches_updated_at
  BEFORE UPDATE ON public.vouches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();