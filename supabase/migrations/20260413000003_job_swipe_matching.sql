-- Job Swipe Matching: batch storage + user actions
-- Run in Supabase Dashboard SQL Editor

-- Batch storage: each generated set of matched jobs
CREATE TABLE job_match_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'weekly_free' CHECK (trigger_type IN ('weekly_free', 'on_demand')),
  week_start DATE NOT NULL DEFAULT date_trunc('week', now())::date,
  jobs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  CONSTRAINT one_free_per_week UNIQUE (user_id, week_start, trigger_type)
);

-- User actions on swiped jobs
CREATE TABLE job_swipe_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES job_match_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('apply', 'skip', 'save')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_action_per_job UNIQUE (user_id, job_id, batch_id)
);

CREATE INDEX idx_jmb_user ON job_match_batches(user_id, week_start);
CREATE INDEX idx_jsa_user ON job_swipe_actions(user_id, action);

ALTER TABLE job_match_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_swipe_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own batches" ON job_match_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts batches" ON job_match_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own actions" ON job_swipe_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own actions" ON job_swipe_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
