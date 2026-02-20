
-- Trigger function: sync INSERT on class_time_templates to students
CREATE OR REPLACE FUNCTION public.sync_class_template_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update matching time_grid slots for all students in this class
  UPDATE public.time_grid tg
  SET 
    status = NEW.status,
    custom_label = NEW.label,
    color = NEW.color,
    subject_id = NEW.subject_id,
    schedule_type = NEW.schedule_type,
    inherited_from_class = true,
    updated_at = now()
  FROM public.students s
  WHERE s.class_id = NEW.class_id
    AND tg.student_id = s.id
    AND tg.day_of_week = NEW.day_of_week
    AND tg.start_time = NEW.start_time;
  
  RETURN NEW;
END;
$$;

-- Trigger function: sync UPDATE on class_time_templates to students
CREATE OR REPLACE FUNCTION public.sync_class_template_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update matching inherited slots
  UPDATE public.time_grid tg
  SET 
    status = NEW.status,
    custom_label = NEW.label,
    color = NEW.color,
    subject_id = NEW.subject_id,
    schedule_type = NEW.schedule_type,
    updated_at = now()
  FROM public.students s
  WHERE s.class_id = NEW.class_id
    AND tg.student_id = s.id
    AND tg.day_of_week = NEW.day_of_week
    AND tg.start_time = NEW.start_time
    AND tg.inherited_from_class = true;
  
  RETURN NEW;
END;
$$;

-- Trigger function: sync DELETE on class_time_templates to students
CREATE OR REPLACE FUNCTION public.sync_class_template_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reset inherited slots back to free
  UPDATE public.time_grid tg
  SET 
    status = 'free',
    custom_label = NULL,
    color = NULL,
    subject_id = NULL,
    schedule_type = 'free',
    inherited_from_class = false,
    updated_at = now()
  FROM public.students s
  WHERE s.class_id = OLD.class_id
    AND tg.student_id = s.id
    AND tg.day_of_week = OLD.day_of_week
    AND tg.start_time = OLD.start_time
    AND tg.inherited_from_class = true;
  
  RETURN OLD;
END;
$$;

-- Create triggers
CREATE TRIGGER sync_template_insert
AFTER INSERT ON public.class_time_templates
FOR EACH ROW
EXECUTE FUNCTION public.sync_class_template_insert();

CREATE TRIGGER sync_template_update
AFTER UPDATE ON public.class_time_templates
FOR EACH ROW
EXECUTE FUNCTION public.sync_class_template_update();

CREATE TRIGGER sync_template_delete
AFTER DELETE ON public.class_time_templates
FOR EACH ROW
EXECUTE FUNCTION public.sync_class_template_delete();
