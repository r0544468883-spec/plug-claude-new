-- Drop the permissive INSERT policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Create a more secure INSERT policy - only allow inserting notifications for yourself
-- (Edge functions will use service role to bypass RLS when creating notifications for users)
CREATE POLICY "Users can receive notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);