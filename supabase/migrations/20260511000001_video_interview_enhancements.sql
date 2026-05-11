-- Add mode column to video_interviews (structured = question-by-question, freeform = single open recording)
ALTER TABLE video_interviews
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'structured' CHECK (mode IN ('structured', 'freeform'));

-- Add media attachment support per question
ALTER TABLE video_interview_questions
  ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT NULL CHECK (media_type IN ('video', 'image', 'pdf', 'link', NULL));
