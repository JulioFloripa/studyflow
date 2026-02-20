-- Migração: Adicionar Disciplina aos Horários
-- Permite vincular horários de aula a disciplinas específicas para implementar "aula dada é aula estudada"

-- Adicionar subject_id em class_time_templates
ALTER TABLE class_time_templates
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Adicionar subject_id em time_grid
ALTER TABLE time_grid
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Adicionar tipo de horário (aula, revisão, aprofundamento, livre)
ALTER TABLE class_time_templates
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'class' CHECK (schedule_type IN ('class', 'study', 'free', 'other'));

ALTER TABLE time_grid
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'free' CHECK (schedule_type IN ('class', 'study', 'free', 'other'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_class_time_templates_subject ON class_time_templates(subject_id);
CREATE INDEX IF NOT EXISTS idx_time_grid_subject ON time_grid(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_time_templates_schedule_type ON class_time_templates(schedule_type);
CREATE INDEX IF NOT EXISTS idx_time_grid_schedule_type ON time_grid(schedule_type);

-- Comentários
COMMENT ON COLUMN class_time_templates.subject_id IS 'Disciplina vinculada ao horário (ex: Biologia, Matemática)';
COMMENT ON COLUMN time_grid.subject_id IS 'Disciplina vinculada ao horário (ex: Biologia, Matemática)';
COMMENT ON COLUMN class_time_templates.schedule_type IS 'Tipo de horário: class (aula presencial), study (estudo), free (livre), other (outro)';
COMMENT ON COLUMN time_grid.schedule_type IS 'Tipo de horário: class (aula presencial), study (estudo), free (livre), other (outro)';

-- Atualizar função de cópia de templates para incluir subject_id
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
      subject_id,
      schedule_type,
      inherited_from_class
    )
    VALUES (
      p_student_id,
      v_template.day_of_week,
      v_template.start_time,
      v_template.status,
      v_template.label,
      v_template.color,
      v_template.subject_id,
      v_template.schedule_type,
      TRUE
    )
    ON CONFLICT (student_id, day_of_week, start_time) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar trigger de sincronização para incluir subject_id
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
      subject_id = NEW.subject_id,
      schedule_type = NEW.schedule_type,
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
      subject_id,
      schedule_type,
      inherited_from_class
    )
    SELECT 
      s.id,
      NEW.day_of_week,
      NEW.start_time,
      NEW.status,
      NEW.label,
      NEW.color,
      NEW.subject_id,
      NEW.schedule_type,
      TRUE
    FROM students s
    WHERE s.class_id = NEW.class_id
    ON CONFLICT (student_id, day_of_week, start_time) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar para obter horários de aula por disciplina
CREATE OR REPLACE FUNCTION get_class_schedule_by_subject(
  p_student_id UUID
)
RETURNS TABLE (
  day_of_week INTEGER,
  start_time TEXT,
  subject_id UUID,
  subject_name TEXT,
  label TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tg.day_of_week,
    tg.start_time,
    tg.subject_id,
    s.name as subject_name,
    tg.label
  FROM time_grid tg
  LEFT JOIN subjects s ON tg.subject_id = s.id
  WHERE tg.student_id = p_student_id
    AND tg.schedule_type = 'class'
    AND tg.subject_id IS NOT NULL
  ORDER BY tg.day_of_week, tg.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_class_schedule_by_subject IS 'Retorna horários de aula do aluno organizados por disciplina';
