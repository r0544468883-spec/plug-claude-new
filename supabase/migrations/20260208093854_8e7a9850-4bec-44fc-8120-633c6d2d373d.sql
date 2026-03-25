-- Create table to track company vouch prompts and completions
CREATE TABLE public.company_vouch_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_based', 'stage_change', 'completion')),
  trigger_stage TEXT, -- The stage that triggered the prompt (for stage_change type)
  prompted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vouch_completed BOOLEAN DEFAULT FALSE,
  vouch_completed_at TIMESTAMP WITH TIME ZONE,
  credits_awarded INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, application_id, trigger_type, trigger_stage)
);

-- Enable RLS
ALTER TABLE public.company_vouch_prompts ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own prompts
CREATE POLICY "Users can view own prompts"
ON public.company_vouch_prompts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
ON public.company_vouch_prompts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
ON public.company_vouch_prompts FOR UPDATE
USING (auth.uid() = user_id);

-- Create company vouches table for anonymous company feedback
CREATE TABLE public.company_vouches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  
  -- Ratings (1-5 scale)
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  process_speed_rating INTEGER CHECK (process_speed_rating >= 1 AND process_speed_rating <= 5),
  transparency_rating INTEGER CHECK (transparency_rating >= 1 AND transparency_rating <= 5),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Process outcome
  process_outcome TEXT CHECK (process_outcome IN ('hired', 'rejected', 'ghosted', 'withdrew', 'ongoing')),
  
  -- Feedback
  feedback_text TEXT,
  would_recommend BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One vouch per user per company per application
  UNIQUE(user_id, company_id, application_id)
);

-- Enable RLS
ALTER TABLE public.company_vouches ENABLE ROW LEVEL SECURITY;

-- Users can manage their own vouches
CREATE POLICY "Users can view own vouches"
ON public.company_vouches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vouches"
ON public.company_vouches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vouches"
ON public.company_vouches FOR UPDATE
USING (auth.uid() = user_id);

-- Anonymous aggregate view for company ratings (no user_id exposed)
CREATE VIEW public.company_ratings AS
SELECT 
  company_id,
  COUNT(*) as total_reviews,
  ROUND(AVG(communication_rating)::numeric, 1) as avg_communication,
  ROUND(AVG(process_speed_rating)::numeric, 1) as avg_process_speed,
  ROUND(AVG(transparency_rating)::numeric, 1) as avg_transparency,
  ROUND(AVG(overall_rating)::numeric, 1) as avg_overall,
  COUNT(*) FILTER (WHERE would_recommend = true) as recommend_count,
  COUNT(*) FILTER (WHERE process_outcome = 'ghosted') as ghosted_count,
  COUNT(*) FILTER (WHERE process_outcome = 'hired') as hired_count
FROM public.company_vouches
GROUP BY company_id
HAVING COUNT(*) >= 3; -- Only show ratings with at least 3 reviews for anonymity

-- Index for faster queries
CREATE INDEX idx_company_vouch_prompts_user ON public.company_vouch_prompts(user_id);
CREATE INDEX idx_company_vouch_prompts_app ON public.company_vouch_prompts(application_id);
CREATE INDEX idx_company_vouches_company ON public.company_vouches(company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_company_vouches_updated_at
BEFORE UPDATE ON public.company_vouches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();