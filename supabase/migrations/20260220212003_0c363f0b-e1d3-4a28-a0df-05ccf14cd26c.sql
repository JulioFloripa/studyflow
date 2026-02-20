
-- Tabela de conteúdos da ementa (progressão por disciplina do horário)
CREATE TABLE public.syllabus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_subject_id UUID NOT NULL REFERENCES public.schedule_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, current, completed
  planned_week INTEGER, -- Semana planejada (1, 2, 3...)
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_syllabus_items_subject ON public.syllabus_items(schedule_subject_id);
CREATE INDEX idx_syllabus_items_order ON public.syllabus_items(schedule_subject_id, sort_order);

-- RLS
ALTER TABLE public.syllabus_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage syllabus via schedule_subjects"
ON public.syllabus_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.schedule_subjects ss
    WHERE ss.id = syllabus_items.schedule_subject_id
      AND ss.coordinator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.schedule_subjects ss
    WHERE ss.id = syllabus_items.schedule_subject_id
      AND ss.coordinator_id = auth.uid()
  )
);

-- Trigger updated_at
CREATE TRIGGER update_syllabus_items_updated_at
  BEFORE UPDATE ON public.syllabus_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
