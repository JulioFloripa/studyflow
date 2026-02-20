
-- Criar tabela de disciplinas do horário (independente do sistema de estudo)
CREATE TABLE public.schedule_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinator_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4338CA',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage own schedule subjects"
ON public.schedule_subjects
FOR ALL
USING (auth.uid() = coordinator_id)
WITH CHECK (auth.uid() = coordinator_id);

-- Atualizar FKs: remover FK antiga de subjects e apontar para schedule_subjects
ALTER TABLE public.class_time_templates
  DROP CONSTRAINT IF EXISTS class_time_templates_subject_id_fkey;

ALTER TABLE public.class_time_templates
  ADD CONSTRAINT class_time_templates_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.schedule_subjects(id) ON DELETE SET NULL;

ALTER TABLE public.time_grid
  DROP CONSTRAINT IF EXISTS time_grid_subject_id_fkey;

ALTER TABLE public.time_grid
  ADD CONSTRAINT time_grid_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.schedule_subjects(id) ON DELETE SET NULL;

-- Atualizar função get_class_schedule_by_subject para usar schedule_subjects
CREATE OR REPLACE FUNCTION public.get_class_schedule_by_subject(p_student_id uuid)
 RETURNS TABLE(day_of_week integer, start_time text, subject_id uuid, subject_name text, schedule_type text)
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
    ss.name as subject_name,
    tg.schedule_type
  FROM public.time_grid tg
  LEFT JOIN public.schedule_subjects ss ON ss.id = tg.subject_id
  WHERE tg.student_id = p_student_id
    AND tg.schedule_type = 'class'
    AND tg.subject_id IS NOT NULL
  ORDER BY tg.day_of_week, tg.start_time;
END;
$function$;
