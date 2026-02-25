
-- Editais (exam presets managed by coordinators, linked to classes)
CREATE TABLE public.editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage own editais"
  ON public.editais FOR ALL
  USING (auth.uid() = coordinator_id)
  WITH CHECK (auth.uid() = coordinator_id);

-- Students in the class can view editais
CREATE POLICY "Students view class editais"
  ON public.editais FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.class_id = editais.class_id
        AND s.user_id = auth.uid()
    )
  );

-- Edital subjects
CREATE TABLE public.edital_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4338CA',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage edital subjects"
  ON public.edital_subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.editais e
      WHERE e.id = edital_subjects.edital_id
        AND e.coordinator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.editais e
      WHERE e.id = edital_subjects.edital_id
        AND e.coordinator_id = auth.uid()
    )
  );

CREATE POLICY "Students view edital subjects"
  ON public.edital_subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.editais e
      JOIN public.students s ON s.class_id = e.class_id
      WHERE e.id = edital_subjects.edital_id
        AND s.user_id = auth.uid()
    )
  );

-- Edital topics
CREATE TABLE public.edital_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_subject_id UUID NOT NULL REFERENCES public.edital_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage edital topics"
  ON public.edital_topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.edital_subjects es
      JOIN public.editais e ON e.id = es.edital_id
      WHERE es.id = edital_topics.edital_subject_id
        AND e.coordinator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.edital_subjects es
      JOIN public.editais e ON e.id = es.edital_id
      WHERE es.id = edital_topics.edital_subject_id
        AND e.coordinator_id = auth.uid()
    )
  );

CREATE POLICY "Students view edital topics"
  ON public.edital_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.edital_subjects es
      JOIN public.editais e ON e.id = es.edital_id
      JOIN public.students s ON s.class_id = e.class_id
      WHERE es.id = edital_topics.edital_subject_id
        AND s.user_id = auth.uid()
    )
  );

-- Student edital selections (tracks which editais a student imported)
CREATE TABLE public.student_edital_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  synced_version INTEGER NOT NULL DEFAULT 1,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, edital_id)
);

ALTER TABLE public.student_edital_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own selections"
  ON public.student_edital_selections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Coordinators can view selections of their students
CREATE POLICY "Coordinators view student selections"
  ON public.student_edital_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = student_edital_selections.user_id
        AND s.coordinator_id = auth.uid()
    )
  );

-- Auto-increment edital version on update
CREATE OR REPLACE FUNCTION public.increment_edital_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_increment_edital_version
  BEFORE UPDATE ON public.editais
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_edital_version();
