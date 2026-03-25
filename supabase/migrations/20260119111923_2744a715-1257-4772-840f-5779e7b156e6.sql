-- Make the notifications policy more secure - only allow inserting notifications for yourself or via service role
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

-- Allow authenticated users to receive notifications addressed to them
-- The Edge Function uses service role which bypasses RLS
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);