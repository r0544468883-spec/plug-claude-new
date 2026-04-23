-- Company Claim + enrichment columns
-- Run in Supabase Dashboard SQL Editor

ALTER TABLE companies ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count TEXT; -- e.g. '50-200'

-- Enable RLS if not already
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Everyone can read companies
DROP POLICY IF EXISTS "companies_public_read" ON companies;
CREATE POLICY "companies_public_read" ON companies
  FOR SELECT USING (true);

-- Claimed owner OR original creator can update
DROP POLICY IF EXISTS "companies_owner_update" ON companies;
CREATE POLICY "companies_owner_update" ON companies
  FOR UPDATE USING (
    auth.uid() = claimed_by OR auth.uid() = created_by
  );

-- Anyone authenticated can insert (for auto-create via trigger)
DROP POLICY IF EXISTS "companies_auth_insert" ON companies;
CREATE POLICY "companies_auth_insert" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
