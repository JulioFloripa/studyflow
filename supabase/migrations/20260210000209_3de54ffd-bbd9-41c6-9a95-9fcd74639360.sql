
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  weekly_goal_hours NUMERIC NOT NULL DEFAULT 20,
  exam_date DATE,
  availability JSONB NOT NULL DEFAULT '{"seg":2,"ter":2,"qua":2,"qui":2,"sex":2,"sab":4,"dom":4}',
  review_intervals JSONB NOT NULL DEFAULT '[1,7,30]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  color TEXT NOT NULL DEFAULT '#4338CA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own topics" ON public.topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study sessions table
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  questions_total INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  videos_watched INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  original_session_id UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_date DATE,
  minutes_spent INTEGER,
  questions_total INTEGER,
  questions_correct INTEGER,
  type TEXT NOT NULL DEFAULT 'D1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own reviews" ON public.reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Imported presets tracking
CREATE TABLE public.imported_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preset_id)
);

ALTER TABLE public.imported_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own imported presets" ON public.imported_presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study cycle table
CREATE TABLE public.study_cycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  minutes_suggested INTEGER NOT NULL DEFAULT 25,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_cycle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own cycle" ON public.study_cycle FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
