
-- Add study configuration columns to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{"dom": 4, "qua": 2, "qui": 2, "sab": 4, "seg": 2, "sex": 2, "ter": 2}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_intervals jsonb DEFAULT '[1, 7, 30]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_goal_hours numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS exam_date date,
  ADD COLUMN IF NOT EXISTS objective text DEFAULT '';
