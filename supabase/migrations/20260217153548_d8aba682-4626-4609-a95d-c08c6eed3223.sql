
-- Create missions table
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  created_by uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id),
  title text NOT NULL,
  description text,
  commission_model text NOT NULL DEFAULT 'percentage',
  commission_value numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'open',
  urgency text NOT NULL DEFAULT 'standard',
  min_reliability_score integer,
  required_specializations text[],
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create mission_bids table
CREATE TABLE public.mission_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
  hunter_id uuid NOT NULL,
  pitch text NOT NULL,
  verified_candidates_count integer DEFAULT 0,
  vouched_candidates_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_bids ENABLE ROW LEVEL SECURITY;

-- Missions RLS policies
CREATE POLICY "Authenticated users can view open missions"
ON public.missions FOR SELECT
USING (status = 'open' OR created_by = auth.uid());

CREATE POLICY "HR users can create missions"
ON public.missions FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (has_role(auth.uid(), 'freelance_hr'::app_role) OR has_role(auth.uid(), 'inhouse_hr'::app_role))
);

CREATE POLICY "Mission creators can update own missions"
ON public.missions FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Mission creators can delete own missions"
ON public.missions FOR DELETE
USING (auth.uid() = created_by);

-- Mission Bids RLS policies
CREATE POLICY "Hunters can view own bids"
ON public.mission_bids FOR SELECT
USING (auth.uid() = hunter_id);

CREATE POLICY "Mission creators can view bids on their missions"
ON public.mission_bids FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.missions m
  WHERE m.id = mission_bids.mission_id AND m.created_by = auth.uid()
));

CREATE POLICY "HR users can create bids"
ON public.mission_bids FOR INSERT
WITH CHECK (
  auth.uid() = hunter_id
  AND (has_role(auth.uid(), 'freelance_hr'::app_role) OR has_role(auth.uid(), 'inhouse_hr'::app_role))
);

CREATE POLICY "Hunters can update own bids"
ON public.mission_bids FOR UPDATE
USING (auth.uid() = hunter_id);

CREATE POLICY "Mission creators can update bid status"
ON public.mission_bids FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.missions m
  WHERE m.id = mission_bids.mission_id AND m.created_by = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mission_bids_updated_at
BEFORE UPDATE ON public.mission_bids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
