
-- Adicionar subject_id e schedule_type à class_time_templates
ALTER TABLE public.class_time_templates 
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'class' CHECK (schedule_type IN ('class', 'study', 'free', 'other'));

-- Adicionar subject_id e schedule_type à time_grid
ALTER TABLE public.time_grid 
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'free' CHECK (schedule_type IN ('class', 'study', 'free', 'other'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_class_time_templates_subject ON public.class_time_templates(subject_id);
CREATE INDEX IF NOT EXISTS idx_time_grid_subject ON public.time_grid(subject_id);
CREATE INDEX IF NOT EXISTS idx_time_grid_schedule_type ON public.time_grid(schedule_type);

-- Atualizar função copy_class_templates_to_student para incluir novos campos
CREATE OR REPLACE FUNCTION public.copy_class_templates_to_student(p_student_id uuid, p_class_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.time_grid tg
  SET 
    status = ct.status,
    custom_label = ct.label,
    color = ct.color,
    subject_id = ct.subject_id,
    schedule_type = ct.schedule_type,
    inherited_from_class = true
  FROM public.class_time_templates ct
  WHERE ct.class_id = p_class_id
    AND tg.student_id = p_student_id
    AND tg.day_of_week = ct.day_of_week
    AND tg.start_time = ct.start_time;
END;
$function$;

-- Função para obter horários de aula por disciplina
CREATE OR REPLACE FUNCTION public.get_class_schedule_by_subject(p_student_id uuid)
 RETURNS TABLE(
   day_of_week integer,
   start_time text,
   subject_id uuid,
   subject_name text,
   schedule_type text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tg.day_of_week,
    tg.start_time,
    tg.subject_id,
    s.name as subject_name,
    tg.schedule_type
  FROM public.time_grid tg
  LEFT JOIN public.subjects s ON s.id = tg.subject_id
  WHERE tg.student_id = p_student_id
    AND tg.schedule_type = 'class'
    AND tg.subject_id IS NOT NULL
  ORDER BY tg.day_of_week, tg.start_time;
END;
$function$;
