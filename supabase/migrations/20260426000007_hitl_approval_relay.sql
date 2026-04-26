-- P3-A: HITL Approval Relay via Supabase
-- Allows the web app dashboard to approve/reject extension agent applications
-- without needing a Chrome extension context.
--
-- Flow:
--   Extension agent needs approval
--   → writes job info to pending_approval
--   → web app sees it via realtime, shows approve/reject UI
--   → web app writes decision to approval_decision
--   → extension reads decision via realtime, resolves the approval
--   → both columns cleared

ALTER TABLE public.extension_agent_control
  ADD COLUMN IF NOT EXISTS pending_approval JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approval_decision JSONB DEFAULT NULL;

COMMENT ON COLUMN public.extension_agent_control.pending_approval IS
  'Set by extension when agent needs human approval: { taskId, job: { id, title, company, score }, requestedAt }';

COMMENT ON COLUMN public.extension_agent_control.approval_decision IS
  'Set by web app: { decision: "approved"|"rejected", taskId, jobId, decidedAt }';
