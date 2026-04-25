-- Job filter preferences per user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_companies text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_job_age_days int DEFAULT 90;

NOTIFY pgrst, 'reload schema';
