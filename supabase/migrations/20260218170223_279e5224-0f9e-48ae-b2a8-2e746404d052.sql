
-- 3.3 Create interviews table first, then interview_slots
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  interview_type TEXT DEFAULT 'video' CHECK (interview_type IN ('video','phone','onsite','technical')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  notes TEXT,
  scheduling_mode TEXT DEFAULT 'fixed' CHECK (scheduling_mode IN ('fixed','candidate_picks')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage their interviews"
  ON interviews FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Candidates view their own interviews"
  ON interviews FOR SELECT
  USING (candidate_id = auth.uid());

CREATE TABLE IF NOT EXISTS interview_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiter can manage slots for their interviews"
  ON interview_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM interviews i WHERE i.id = interview_slots.interview_id AND i.created_by = auth.uid()
    )
  );

CREATE POLICY "Candidate can view and select their own slots"
  ON interview_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM interviews i WHERE i.id = interview_slots.interview_id AND i.candidate_id = auth.uid()
    )
  );

-- 3.4 Multi-Channel Job Publishing
CREATE TABLE IF NOT EXISTS job_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('plug','alljobs','drushim','linkedin','indeed','google_jobs','facebook_jobs')),
  external_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','published','failed','expired','removed')),
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, channel)
);

ALTER TABLE job_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage their own publications"
  ON job_publications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_publications.job_id AND j.created_by = auth.uid())
  );

-- 3.5 DEI Blind Hiring
ALTER TABLE applications ADD COLUMN IF NOT EXISTS blind_mode BOOLEAN DEFAULT false;

-- 3.7 Behavioral Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  job_id UUID REFERENCES jobs(id),
  title TEXT NOT NULL,
  assessment_type TEXT CHECK (assessment_type IN ('behavioral','technical','situational')),
  questions JSONB NOT NULL DEFAULT '[]',
  time_limit_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage their assessments"
  ON assessments FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Candidates can view assessments for their jobs"
  ON assessments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM applications a WHERE a.job_id = assessments.job_id AND a.candidate_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  total_score NUMERIC(5,2),
  ai_feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, candidate_id)
);

ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates manage their own submissions"
  ON assessment_submissions FOR ALL
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters view submissions for their assessments"
  ON assessment_submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_submissions.assessment_id AND a.created_by = auth.uid())
  );

-- 3.8 Consent Records & Deletion Requests
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT CHECK (consent_type IN ('terms','privacy','marketing','data_processing','cookies')),
  granted BOOLEAN NOT NULL,
  ip_address TEXT,
  granted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own consent records"
  ON consent_records FOR ALL
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own deletion requests"
  ON data_deletion_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users create their own deletion requests"
  ON data_deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());
