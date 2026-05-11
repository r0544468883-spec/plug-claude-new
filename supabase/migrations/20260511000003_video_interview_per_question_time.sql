-- Add per-question answer time override to video_interview_questions
ALTER TABLE video_interview_questions
  ADD COLUMN IF NOT EXISTS answer_time_seconds INTEGER DEFAULT NULL;
