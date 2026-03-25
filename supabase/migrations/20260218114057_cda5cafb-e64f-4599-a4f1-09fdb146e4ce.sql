
-- Feature 2.1: Knockout Questions
CREATE TABLE IF NOT EXISTS public.knockout_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  correct_answer BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knockout_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.knockout_questions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  answer BOOLEAN NOT NULL,
  passed BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.knockout_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knockout_answers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='knockout_questions' AND policyname='Recruiters can manage knockout questions for their jobs') THEN
    CREATE POLICY "Recruiters can manage knockout questions for their jobs" ON public.knockout_questions FOR ALL USING (job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='knockout_questions' AND policyname='Anyone can read knockout questions') THEN
    CREATE POLICY "Anyone can read knockout questions" ON public.knockout_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='knockout_answers' AND policyname='Candidates can insert their own answers') THEN
    CREATE POLICY "Candidates can insert their own answers" ON public.knockout_answers FOR INSERT WITH CHECK (candidate_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='knockout_answers' AND policyname='Candidates can read their own answers') THEN
    CREATE POLICY "Candidates can read their own answers" ON public.knockout_answers FOR SELECT USING (candidate_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='knockout_answers' AND policyname='Recruiters can read answers for their jobs') THEN
    CREATE POLICY "Recruiters can read answers for their jobs" ON public.knockout_answers FOR SELECT USING (question_id IN (SELECT kq.id FROM public.knockout_questions kq JOIN public.jobs j ON j.id = kq.job_id WHERE j.created_by = auth.uid()));
  END IF;
END $$;

-- Feature 2.3: Candidate Experience Survey
CREATE TABLE IF NOT EXISTS public.candidate_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id),
  trigger_event TEXT CHECK (trigger_event IN ('after_interview','after_rejection','after_offer','after_hire')),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  process_rating INTEGER CHECK (process_rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  would_recommend BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.candidate_surveys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidate_surveys' AND policyname='Candidates can submit their own surveys') THEN
    CREATE POLICY "Candidates can submit their own surveys" ON public.candidate_surveys FOR INSERT WITH CHECK (candidate_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidate_surveys' AND policyname='Candidates can read their own surveys') THEN
    CREATE POLICY "Candidates can read their own surveys" ON public.candidate_surveys FOR SELECT USING (candidate_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='candidate_surveys' AND policyname='Recruiters can read surveys for their jobs') THEN
    CREATE POLICY "Recruiters can read surveys for their jobs" ON public.candidate_surveys FOR SELECT USING (job_id IN (SELECT id FROM public.jobs WHERE created_by = auth.uid()));
  END IF;
END $$;

-- Feature 2.4: Referral Program (table already exists, just add RLS if missing)
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='Users can manage their own referrals') THEN
    CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (referrer_id = auth.uid());
  END IF;
END $$;

-- Feature 2.5: Talent Pool
CREATE TABLE IF NOT EXISTS public.talent_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.talent_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.talent_pools(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  added_by UUID NOT NULL,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pool_id, candidate_id)
);

ALTER TABLE public.talent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='talent_pools' AND policyname='Recruiters can manage their own talent pools') THEN
    CREATE POLICY "Recruiters can manage their own talent pools" ON public.talent_pools FOR ALL USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='talent_pool_members' AND policyname='Recruiters can manage members in their pools') THEN
    CREATE POLICY "Recruiters can manage members in their pools" ON public.talent_pool_members FOR ALL USING (pool_id IN (SELECT id FROM public.talent_pools WHERE created_by = auth.uid()));
  END IF;
END $$;

-- Feature 2.6: Approval Workflows
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  approver_id UUID NOT NULL,
  request_type TEXT CHECK (request_type IN ('new_job','offer','budget','hire')),
  reference_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='approval_requests' AND policyname='Requesters can manage their own requests') THEN
    CREATE POLICY "Requesters can manage their own requests" ON public.approval_requests FOR ALL USING (requester_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='approval_requests' AND policyname='Approvers can read assigned requests') THEN
    CREATE POLICY "Approvers can read assigned requests" ON public.approval_requests FOR SELECT USING (approver_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='approval_requests' AND policyname='Approvers can update their assigned requests') THEN
    CREATE POLICY "Approvers can update their assigned requests" ON public.approval_requests FOR UPDATE USING (approver_id = auth.uid());
  END IF;
END $$;

-- Feature 2.8: Job Alerts
CREATE TABLE IF NOT EXISTS public.job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_name TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('immediate','daily','weekly')),
  channel TEXT DEFAULT 'push' CHECK (channel IN ('push','email','both')),
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='job_alerts' AND policyname='Users can manage their own job alerts') THEN
    CREATE POLICY "Users can manage their own job alerts" ON public.job_alerts FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
