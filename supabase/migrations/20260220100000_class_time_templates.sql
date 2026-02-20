-- Migração: Horários Padrão por Turma
-- Permite definir horários de aula na turma e herdar para alunos automaticamente

-- Criar tabela de templates de horário por turma
CREATE TABLE IF NOT EXISTS class_time_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Aula',
  color TEXT DEFAULT '#ef4444',
  status TEXT NOT NULL DEFAULT 'occupied' CHECK (status IN ('free', 'occupied', 'custom')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que não haja duplicatas
  UNIQUE(class_id, day_of_week, start_time)
);

-- Índices para performance
CREATE INDEX idx_class_time_templates_class_id ON class_time_templates(class_id);
CREATE INDEX idx_class_time_templates_day ON class_time_templates(day_of_week);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_class_time_templates_updated_at
  BEFORE UPDATE ON class_time_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE class_time_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Coordenadores podem ver templates de suas turmas"
  ON class_time_templates FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Coordenadores podem criar templates"
  ON class_time_templates FOR INSERT
  WITH CHECK (
    class_id IN (
      SELECT id FROM classes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Coordenadores podem atualizar templates"
  ON class_time_templates FOR UPDATE
  USING (
    class_id IN (
      SELECT id FROM classes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Coordenadores podem deletar templates"
  ON class_time_templates FOR DELETE
  USING (
    class_id IN (
      SELECT id FROM classes WHERE user_id = auth.uid()
    )
  );

-- Adicionar campo na tabela time_grid para rastrear origem
ALTER TABLE time_grid 
ADD COLUMN IF NOT EXISTS inherited_from_class BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON TABLE class_time_templates IS 'Templates de horários padrão por turma, herdados automaticamente pelos alunos';
COMMENT ON COLUMN class_time_templates.day_of_week IS '0=Domingo, 1=Segunda, ..., 6=Sábado';
COMMENT ON COLUMN class_time_templates.start_time IS 'Horário de início no formato HH:MM';
COMMENT ON COLUMN class_time_templates.label IS 'Descrição do horário (ex: Aula, Laboratório, Estágio)';
COMMENT ON COLUMN class_time_templates.status IS 'Status padrão: free, occupied, custom';
COMMENT ON COLUMN time_grid.inherited_from_class IS 'Indica se o horário foi herdado da turma';

-- Função para copiar templates da turma para um aluno
CREATE OR REPLACE FUNCTION copy_class_templates_to_student(
  p_student_id UUID,
  p_class_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_template RECORD;
BEGIN
  -- Iterar sobre todos os templates da turma
  FOR v_template IN 
    SELECT * FROM class_time_templates 
    WHERE class_id = p_class_id
  LOOP
    -- Inserir no time_grid do aluno (ignorar se já existir)
    INSERT INTO time_grid (
      student_id,
      day_of_week,
      start_time,
      status,
      label,
      color,
      inherited_from_class
    )
    VALUES (
      p_student_id,
      v_template.day_of_week,
      v_template.start_time,
      v_template.status,
      v_template.label,
      v_template.color,
      TRUE
    )
    ON CONFLICT (student_id, day_of_week, start_time) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário na função
COMMENT ON FUNCTION copy_class_templates_to_student IS 'Copia templates de horário da turma para a grade do aluno';

-- Função para atualizar horários herdados quando template da turma mudar
CREATE OR REPLACE FUNCTION update_inherited_time_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for DELETE, remover dos alunos
  IF TG_OP = 'DELETE' THEN
    DELETE FROM time_grid
    WHERE inherited_from_class = TRUE
      AND day_of_week = OLD.day_of_week
      AND start_time = OLD.start_time
      AND student_id IN (
        SELECT id FROM students WHERE class_id = OLD.class_id
      );
    RETURN OLD;
  END IF;
  
  -- Se for UPDATE, atualizar nos alunos
  IF TG_OP = 'UPDATE' THEN
    UPDATE time_grid
    SET 
      label = NEW.label,
      color = NEW.color,
      status = NEW.status,
      updated_at = NOW()
    WHERE inherited_from_class = TRUE
      AND day_of_week = OLD.day_of_week
      AND start_time = OLD.start_time
      AND student_id IN (
        SELECT id FROM students WHERE class_id = NEW.class_id
      );
    RETURN NEW;
  END IF;
  
  -- Se for INSERT, adicionar para todos os alunos da turma
  IF TG_OP = 'INSERT' THEN
    INSERT INTO time_grid (
      student_id,
      day_of_week,
      start_time,
      status,
      label,
      color,
      inherited_from_class
    )
    SELECT 
      s.id,
      NEW.day_of_week,
      NEW.start_time,
      NEW.status,
      NEW.label,
      NEW.color,
      TRUE
    FROM students s
    WHERE s.class_id = NEW.class_id
    ON CONFLICT (student_id, day_of_week, start_time) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar templates com alunos
CREATE TRIGGER sync_class_templates_to_students
  AFTER INSERT OR UPDATE OR DELETE ON class_time_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_inherited_time_slots();

COMMENT ON FUNCTION update_inherited_time_slots IS 'Sincroniza automaticamente mudanças nos templates da turma com os alunos';
