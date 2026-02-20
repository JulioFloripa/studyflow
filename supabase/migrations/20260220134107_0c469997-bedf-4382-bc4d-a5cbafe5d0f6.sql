
-- Tabela de turmas
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinator_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  semester INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage own classes"
  ON public.classes FOR ALL
  USING (auth.uid() = coordinator_id)
  WITH CHECK (auth.uid() = coordinator_id);

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tabela de alunos
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  coordinator_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  target_career TEXT,
  target_university TEXT,
  current_grade TEXT,
  learning_style JSONB,
  study_methods TEXT[],
  learning_pace TEXT,
  special_needs TEXT,
  academic_history JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage own students"
  ON public.students FOR ALL
  USING (auth.uid() = coordinator_id)
  WITH CHECK (auth.uid() = coordinator_id);

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tabela de grade horária dos alunos
CREATE TABLE public.time_grid (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free',
  custom_label TEXT,
  color TEXT,
  inherited_from_class BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.time_grid ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage student time grids"
  ON public.time_grid FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = time_grid.student_id AND s.coordinator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = time_grid.student_id AND s.coordinator_id = auth.uid()
    )
  );

CREATE TRIGGER update_time_grid_updated_at
  BEFORE UPDATE ON public.time_grid
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tabela de templates de horário da turma
CREATE TABLE public.class_time_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Aula',
  color TEXT,
  status TEXT NOT NULL DEFAULT 'occupied',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.class_time_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage class templates"
  ON public.class_time_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_time_templates.class_id AND c.coordinator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_time_templates.class_id AND c.coordinator_id = auth.uid()
    )
  );

CREATE TRIGGER update_class_time_templates_updated_at
  BEFORE UPDATE ON public.class_time_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Função para inicializar grade horária de um aluno
CREATE OR REPLACE FUNCTION public.initialize_time_grid(p_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deletar slots existentes
  DELETE FROM public.time_grid WHERE student_id = p_student_id;
  
  -- Inserir todos os slots (7 dias x 34 horários)
  INSERT INTO public.time_grid (student_id, day_of_week, start_time, status)
  SELECT 
    p_student_id,
    day,
    LPAD(FLOOR(slot / 2 + 6)::TEXT, 2, '0') || ':' || CASE WHEN slot % 2 = 0 THEN '00' ELSE '30' END,
    'free'
  FROM generate_series(0, 6) AS day,
       generate_series(0, 33) AS slot;
END;
$$;

-- Função para copiar templates da turma para o aluno
CREATE OR REPLACE FUNCTION public.copy_class_templates_to_student(p_student_id UUID, p_class_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.time_grid tg
  SET 
    status = ct.status,
    custom_label = ct.label,
    color = ct.color,
    inherited_from_class = true
  FROM public.class_time_templates ct
  WHERE ct.class_id = p_class_id
    AND tg.student_id = p_student_id
    AND tg.day_of_week = ct.day_of_week
    AND tg.start_time = ct.start_time;
END;
$$;
