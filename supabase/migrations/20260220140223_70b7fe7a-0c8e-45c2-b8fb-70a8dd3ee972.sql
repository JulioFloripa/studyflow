
-- Fix: Drop restrictive policies and recreate as permissive

-- Classes
DROP POLICY IF EXISTS "Coordinators manage own classes" ON public.classes;
CREATE POLICY "Coordinators manage own classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (auth.uid() = coordinator_id)
  WITH CHECK (auth.uid() = coordinator_id);

-- Students
DROP POLICY IF EXISTS "Coordinators manage own students" ON public.students;
CREATE POLICY "Coordinators manage own students"
  ON public.students FOR ALL
  TO authenticated
  USING (auth.uid() = coordinator_id)
  WITH CHECK (auth.uid() = coordinator_id);

-- Time Grid
DROP POLICY IF EXISTS "Coordinators manage student time grids" ON public.time_grid;
CREATE POLICY "Coordinators manage student time grids"
  ON public.time_grid FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = time_grid.student_id AND s.coordinator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.id = time_grid.student_id AND s.coordinator_id = auth.uid()));

-- Class Time Templates
DROP POLICY IF EXISTS "Coordinators manage class templates" ON public.class_time_templates;
CREATE POLICY "Coordinators manage class templates"
  ON public.class_time_templates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM classes c WHERE c.id = class_time_templates.class_id AND c.coordinator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM classes c WHERE c.id = class_time_templates.class_id AND c.coordinator_id = auth.uid()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
