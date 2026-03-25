-- Add anonymous bid column to mission_bids
ALTER TABLE public.mission_bids ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

-- Update mission creation policy: only inhouse_hr can create missions
DROP POLICY IF EXISTS "HR users can create missions" ON public.missions;
CREATE POLICY "Inhouse HR can create missions"
  ON public.missions FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_role(auth.uid(), 'inhouse_hr'::app_role));

-- Update mission management policy: only creators (inhouse_hr) can update/delete
DROP POLICY IF EXISTS "Mission creators can manage" ON public.missions;
CREATE POLICY "Mission creators can manage"
  ON public.missions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Mission creators can delete"
  ON public.missions FOR DELETE
  USING (auth.uid() = created_by);