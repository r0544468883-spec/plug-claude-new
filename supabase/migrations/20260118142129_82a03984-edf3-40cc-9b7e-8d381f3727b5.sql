-- Allow authenticated users to search profiles for vouch feature
CREATE POLICY "Authenticated users can search profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);