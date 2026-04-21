-- Enhanced company insights: structured sections, mutual connections, applied job linkage
ALTER TABLE company_insights
  ADD COLUMN IF NOT EXISTS mutual_connections_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_job_title TEXT,
  ADD COLUMN IF NOT EXISTS insights_sections JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS networking_recommendation TEXT;

-- insights_sections JSONB structure:
-- {
--   "company_overview": "...",
--   "what_they_look_for": "...",
--   "role_fit_growth": "...",
--   "relevant_people": [{"name":"...","title":"...","relevance":"hiring_manager|senior_mgmt|peer","url":"..."}],
--   "networking_tip": "...",
--   "message_suggestion": "..."
-- }
