-- Add bio column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
CREATE POLICY "Users can view their conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update their conversations" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  related_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS policies
CREATE POLICY "Users can view their messages" 
ON public.messages FOR SELECT 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their received messages" 
ON public.messages FOR UPDATE 
USING (auth.uid() = to_user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Update handle_new_user trigger to include avatar from Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'picture', NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- Create index for faster message queries
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_to_user ON public.messages(to_user_id, is_read);
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1, participant_2);

-- Add RLS policy for HR to view candidate profiles through applications
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR 
  profile_visibility = 'public'
  OR
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = profiles.user_id
    AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
  )
);

-- Update jobs policy to allow all authenticated users to post jobs
DROP POLICY IF EXISTS "HR users can create jobs" ON public.jobs;

CREATE POLICY "Authenticated users can create jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  OR (auth.uid() = shared_by_user_id AND is_community_shared = true)
);