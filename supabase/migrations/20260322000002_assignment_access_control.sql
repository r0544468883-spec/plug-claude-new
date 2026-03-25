-- Add access_mode to assignment_templates
-- 'public' = anyone can see and submit
-- 'request_only' = must request access first
ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS access_mode TEXT DEFAULT 'public'
  CHECK (access_mode IN ('public', 'request_only'));

-- Table for access requests
CREATE TABLE IF NOT EXISTS assignment_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES assignment_templates(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, requester_id)
);

ALTER TABLE assignment_access_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own requests
CREATE POLICY "requester_select" ON assignment_access_requests
  FOR SELECT USING (auth.uid() = requester_id);

-- Template owner can see all requests for their templates
CREATE POLICY "owner_select" ON assignment_access_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM assignment_templates WHERE id = template_id AND created_by = auth.uid())
  );

-- Authenticated users can submit requests
CREATE POLICY "request_insert" ON assignment_access_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Template owner can approve/reject
CREATE POLICY "owner_update" ON assignment_access_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM assignment_templates WHERE id = template_id AND created_by = auth.uid())
  );
