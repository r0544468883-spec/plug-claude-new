-- ============================================
-- Fix messaging permissions
-- Run in Supabase Dashboard SQL Editor
-- ============================================

-- 1. Grant access to profiles_secure view
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.profiles_secure TO anon;

-- 2. Grant access to conversations & messages tables
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- 3. Fix RLS: allow service_role to bypass (for seed data reads)
-- Add permissive policies that allow participants to see their data
-- Drop and recreate to be safe

-- Conversations: ensure participants can see, create, update
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Messages: ensure sender/recipient can see, send, update
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
CREATE POLICY "Users can update their received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = to_user_id);

-- 4. Verify: check the demo conversation exists
SELECT c.id, c.participant_1, c.participant_2,
       p1.full_name as user1_name, p2.full_name as user2_name,
       (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant_1
LEFT JOIN profiles p2 ON p2.user_id = c.participant_2
ORDER BY c.created_at DESC
LIMIT 5;
