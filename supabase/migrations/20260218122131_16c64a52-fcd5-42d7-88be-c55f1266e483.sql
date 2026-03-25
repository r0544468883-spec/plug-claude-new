-- Company Reviews table
CREATE TABLE public.company_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  reviewer_id UUID NOT NULL,
  relationship TEXT CHECK (relationship IN ('current_employee','former_employee','candidate','intern')),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  culture_rating INTEGER CHECK (culture_rating BETWEEN 1 AND 5),
  management_rating INTEGER CHECK (management_rating BETWEEN 1 AND 5),
  salary_rating INTEGER CHECK (salary_rating BETWEEN 1 AND 5),
  worklife_rating INTEGER CHECK (worklife_rating BETWEEN 1 AND 5),
  growth_rating INTEGER CHECK (growth_rating BETWEEN 1 AND 5),
  pros TEXT,
  cons TEXT,
  advice TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read approved reviews"
  ON public.company_reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can insert their own reviews"
  ON public.company_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews"
  ON public.company_reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Service role can update is_approved"
  ON public.company_reviews FOR UPDATE
  USING (true);

-- Index for fast lookups by company name
CREATE INDEX idx_company_reviews_company_name ON public.company_reviews (lower(company_name));
CREATE INDEX idx_company_reviews_reviewer ON public.company_reviews (reviewer_id);
