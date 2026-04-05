-- Add session type to study_sessions (study vs class)
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'study'
    CHECK (session_type IN ('study', 'class')),
  ADD COLUMN IF NOT EXISTS class_mode TEXT DEFAULT NULL
    CHECK (class_mode IN ('presencial', 'online', 'gravada', NULL));

COMMENT ON COLUMN public.study_sessions.session_type IS 'Type of session: study (self-study) or class (attended class)';
COMMENT ON COLUMN public.study_sessions.class_mode IS 'For class sessions: presencial, online (ao vivo) or gravada (recorded)';
