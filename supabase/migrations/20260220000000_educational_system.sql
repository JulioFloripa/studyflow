-- Migration: Sistema Educacional Completo
-- Data: 2026-02-20
-- Descrição: Adiciona suporte para modo coordenador, grade horária visual, dados pedagógicos e gestão de turmas

-- =============================================
-- 1. TABELA DE TURMAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  semester INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para turmas
CREATE INDEX idx_classes_coordinator ON public.classes(coordinator_id);

-- RLS para turmas
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordenadores podem gerenciar suas turmas"
  ON public.classes
  FOR ALL
  USING (auth.uid() = coordinator_id);

-- =============================================
-- 2. TABELA DE ALUNOS (STUDENTS)
-- =============================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coordinator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  
  -- Dados Pessoais
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  
  -- Dados Acadêmicos
  target_career TEXT, -- Carreira pretendida
  target_university TEXT, -- Universidade alvo
  current_grade TEXT, -- Série/Ano atual
  
  -- Dados Pedagógicos
  learning_style JSONB DEFAULT '{}', -- Estilo de aprendizagem (visual, auditivo, cinestésico)
  study_methods JSONB DEFAULT '[]', -- Métodos preferidos
  learning_pace TEXT, -- Ritmo: lento, moderado, rápido
  special_needs TEXT, -- Necessidades especiais
  academic_history JSONB DEFAULT '{}', -- Histórico de notas e dificuldades
  
  -- Observações
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para students
CREATE INDEX idx_students_coordinator ON public.students(coordinator_id);
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_user ON public.students(user_id);

-- RLS para students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordenadores podem gerenciar seus alunos"
  ON public.students
  FOR ALL
  USING (auth.uid() = coordinator_id);

CREATE POLICY "Alunos podem ver seus próprios dados"
  ON public.students
  FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- 3. TABELA DE GRADE HORÁRIA (TIME_GRID)
-- =============================================
CREATE TABLE IF NOT EXISTS public.time_grid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Dia da semana (0=domingo, 1=segunda, ..., 6=sábado)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Horário (formato HH:MM, ex: "07:00", "07:30")
  start_time TEXT NOT NULL,
  
  -- Status: 'free', 'occupied', 'custom'
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'custom')),
  
  -- Descrição personalizada (ex: "Aula de Piano", "Academia", "Almoço")
  custom_label TEXT,
  
  -- Cor para visualização (hex)
  color TEXT DEFAULT '#94a3b8',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_id, day_of_week, start_time)
);

-- Índices para time_grid
CREATE INDEX idx_time_grid_student ON public.time_grid(student_id);
CREATE INDEX idx_time_grid_day ON public.time_grid(day_of_week);

-- RLS para time_grid
ALTER TABLE public.time_grid ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso à grade horária via student"
  ON public.time_grid
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = time_grid.student_id
      AND (s.coordinator_id = auth.uid() OR s.user_id = auth.uid())
    )
  );

-- =============================================
-- 4. ATUALIZAR TABELA DE PROFILES
-- =============================================
-- Adicionar campos para perfil de coordenador e pedagógicos
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_coordinator BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_style JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_methods JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_preferences TEXT;

-- =============================================
-- 5. TABELA DE CICLOS PERSONALIZADOS (CUSTOM_CYCLES)
-- =============================================
CREATE TABLE IF NOT EXISTS public.custom_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Dados do ciclo
  cycle_data JSONB NOT NULL, -- Estrutura completa do ciclo gerado
  
  -- Metadados
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para custom_cycles
CREATE INDEX idx_custom_cycles_student ON public.custom_cycles(student_id);
CREATE INDEX idx_custom_cycles_active ON public.custom_cycles(is_active);

-- RLS para custom_cycles
ALTER TABLE public.custom_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso aos ciclos via student"
  ON public.custom_cycles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = custom_cycles.student_id
      AND (s.coordinator_id = auth.uid() OR s.user_id = auth.uid())
    )
  );

-- =============================================
-- 6. TABELA DE RELATÓRIOS GERADOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Tipo de relatório
  report_type TEXT NOT NULL, -- 'weekly_schedule', 'study_plan', 'progress', etc.
  
  -- Dados do relatório
  report_data JSONB NOT NULL,
  
  -- URL do PDF gerado (se aplicável)
  pdf_url TEXT,
  
  -- Metadados
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para generated_reports
CREATE INDEX idx_generated_reports_student ON public.generated_reports(student_id);
CREATE INDEX idx_generated_reports_type ON public.generated_reports(report_type);

-- RLS para generated_reports
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso aos relatórios via student"
  ON public.generated_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = generated_reports.student_id
      AND (s.coordinator_id = auth.uid() OR s.user_id = auth.uid())
    )
  );

-- =============================================
-- 7. FUNÇÕES AUXILIARES
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_grid_updated_at BEFORE UPDATE ON public.time_grid
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_cycles_updated_at BEFORE UPDATE ON public.custom_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. DADOS INICIAIS (SEED)
-- =============================================

-- Função para inicializar grade horária padrão para um estudante
CREATE OR REPLACE FUNCTION initialize_time_grid(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  v_day INTEGER;
  v_hour INTEGER;
  v_minute INTEGER;
  v_time TEXT;
BEGIN
  -- Para cada dia da semana (1=seg a 6=sáb, 0=dom)
  FOR v_day IN 0..6 LOOP
    -- Para cada hora de 6h às 22h30
    FOR v_hour IN 6..22 LOOP
      FOR v_minute IN 0..30 BY 30 LOOP
        -- Pular 23:00
        IF v_hour = 22 AND v_minute = 30 THEN
          EXIT;
        END IF;
        
        v_time := LPAD(v_hour::TEXT, 2, '0') || ':' || LPAD(v_minute::TEXT, 2, '0');
        
        INSERT INTO public.time_grid (student_id, day_of_week, start_time, status)
        VALUES (p_student_id, v_day, v_time, 'free')
        ON CONFLICT (student_id, day_of_week, start_time) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. COMENTÁRIOS
-- =============================================

COMMENT ON TABLE public.classes IS 'Turmas gerenciadas por coordenadores';
COMMENT ON TABLE public.students IS 'Alunos com dados pessoais e pedagógicos completos';
COMMENT ON TABLE public.time_grid IS 'Grade horária visual de 30min para cada aluno';
COMMENT ON TABLE public.custom_cycles IS 'Ciclos de estudo personalizados gerados';
COMMENT ON TABLE public.generated_reports IS 'Relatórios em PDF gerados para alunos';

COMMENT ON COLUMN public.time_grid.status IS 'Status do bloco: free (livre), occupied (ocupado genérico), custom (personalizado com label)';
COMMENT ON COLUMN public.students.learning_style IS 'JSON com scores de estilos: {"visual": 8, "auditivo": 6, "cinestesico": 7}';
COMMENT ON COLUMN public.students.study_methods IS 'Array de métodos preferidos: ["pomodoro", "mapas_mentais", "flashcards"]';
