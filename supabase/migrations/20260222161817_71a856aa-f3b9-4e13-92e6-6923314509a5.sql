
-- Tabela para histórico de ciclos gerados
CREATE TABLE public.student_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  coordinator_id uuid NOT NULL,
  cycle_data jsonb NOT NULL,
  weekly_hours numeric NOT NULL DEFAULT 0,
  total_sessions integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para buscar ciclo ativo rapidamente
CREATE INDEX idx_student_cycles_active ON public.student_cycles(student_id, is_active) WHERE is_active = true;
CREATE INDEX idx_student_cycles_student ON public.student_cycles(student_id, generated_at DESC);

-- RLS
ALTER TABLE public.student_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators manage student cycles"
ON public.student_cycles
FOR ALL
USING (auth.uid() = coordinator_id)
WITH CHECK (auth.uid() = coordinator_id);

-- Trigger: desativar ciclos antigos ao inserir novo
CREATE OR REPLACE FUNCTION public.deactivate_old_cycles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_cycles
  SET is_active = false
  WHERE student_id = NEW.student_id
    AND id != NEW.id
    AND is_active = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deactivate_old_student_cycles
AFTER INSERT ON public.student_cycles
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_old_cycles();
