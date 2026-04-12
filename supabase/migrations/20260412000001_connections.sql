-- ============================================================
-- Connections System — Search Partners / Connection Circles
-- ============================================================
-- Circles:
--   'colleague' = bidirectional (request → accept)
--   'recruiter' = unidirectional (auto-accepted)
-- Companies circle reuses existing `follows` table.

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle TEXT NOT NULL DEFAULT 'colleague' CHECK (circle IN ('colleague', 'recruiter')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  source TEXT DEFAULT 'manual', -- 'manual' | 'vouch' | 'suggestion'
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,

  CONSTRAINT connections_no_self CHECK (requester_id != addressee_id),
  CONSTRAINT connections_unique UNIQUE (requester_id, addressee_id)
);

-- Fast lookups
CREATE INDEX idx_connections_addressee ON connections(addressee_id, status);
CREATE INDEX idx_connections_requester ON connections(requester_id, status);
CREATE INDEX idx_connections_accepted  ON connections(status) WHERE status = 'accepted';

-- Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send connection requests"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Parties can update connection"
  ON connections FOR UPDATE
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Parties can delete connection"
  ON connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
