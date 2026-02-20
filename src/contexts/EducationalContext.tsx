import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Class, Student, TimeSlot, ClassTimeTemplate } from '@/types/educational';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EducationalContextType {
  // State
  classes: Class[];
  students: Student[];
  timeSlots: TimeSlot[];
  classTemplates: ClassTimeTemplate[];
  selectedStudent: Student | null;
  loading: boolean;
  
  // Classes
  addClass: (classData: Omit<Class, 'id' | 'coordinatorId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClass: (id: string, updates: Partial<Class>) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
  
  // Class Time Templates
  loadClassTemplates: (classId: string) => Promise<void>;
  addClassTemplate: (template: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClassTemplate: (id: string, updates: Partial<ClassTimeTemplate>) => Promise<void>;
  removeClassTemplate: (id: string) => Promise<void>;
  bulkAddClassTemplates: (templates: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  
  // Students
  addStudent: (studentData: Omit<Student, 'id' | 'coordinatorId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  selectStudent: (student: Student | null) => void;
  
  // Time Grid
  loadTimeGrid: (studentId: string) => Promise<void>;
  updateTimeSlot: (slotId: string, updates: Partial<TimeSlot>) => Promise<void>;
  bulkUpdateTimeSlots: (updates: Partial<TimeSlot>[]) => Promise<void>;
  initializeTimeGrid: (studentId: string) => Promise<void>;
  copyClassTemplatesToStudent: (studentId: string, classId: string) => Promise<void>;
  
  // Refresh
  refreshData: () => Promise<void>;
}

const EducationalContext = createContext<EducationalContextType | null>(null);

export const useEducational = () => {
  const ctx = useContext(EducationalContext);
  if (!ctx) throw new Error('useEducational must be used within EducationalProvider');
  return ctx;
};

export const EducationalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [classTemplates, setClassTemplates] = useState<ClassTimeTemplate[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Carregar turmas
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('coordinator_id', user.id)
        .order('created_at', { ascending: false });

      if (classesData) {
        setClasses(
          classesData.map((c: any) => ({
            id: c.id,
            coordinatorId: c.coordinator_id,
            name: c.name,
            description: c.description,
            year: c.year,
            semester: c.semester,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }))
        );
      }

      // Carregar alunos
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('coordinator_id', user.id)
        .order('full_name');

      if (studentsData) {
        setStudents(
          studentsData.map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            coordinatorId: s.coordinator_id,
            classId: s.class_id,
            fullName: s.full_name,
            email: s.email,
            phone: s.phone,
            birthDate: s.birth_date,
            targetCareer: s.target_career,
            targetUniversity: s.target_university,
            currentGrade: s.current_grade,
            learningStyle: s.learning_style,
            studyMethods: s.study_methods,
            learningPace: s.learning_pace,
            specialNeeds: s.special_needs,
            academicHistory: s.academic_history,
            notes: s.notes,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Classes
  const addClass = useCallback(
    async (classData: Omit<Class, 'id' | 'coordinatorId' | 'createdAt' | 'updatedAt'>) => {
      if (!user) return;

      const { data, error } = await supabase
        .from('classes')
        .insert({
          coordinator_id: user.id,
          name: classData.name,
          description: classData.description,
          year: classData.year,
          semester: classData.semester,
        })
        .select()
        .single();

      if (!error && data) {
        setClasses(prev => [
          ...prev,
          {
            id: data.id,
            coordinatorId: data.coordinator_id,
            name: data.name,
            description: data.description,
            year: data.year,
            semester: data.semester,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        ]);
      }
    },
    [user]
  );

  const updateClass = useCallback(async (id: string, updates: Partial<Class>) => {
    const { error } = await supabase
      .from('classes')
      .update({
        name: updates.name,
        description: updates.description,
        year: updates.year,
        semester: updates.semester,
      })
      .eq('id', id);

    if (!error) {
      setClasses(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
    }
  }, []);

  const removeClass = useCallback(async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
      setClasses(prev => prev.filter(c => c.id !== id));
    }
  }, []);

  // Students
  const addStudent = useCallback(
    async (studentData: Omit<Student, 'id' | 'coordinatorId' | 'createdAt' | 'updatedAt'>) => {
      if (!user) return;

      const { data, error } = await supabase
        .from('students')
        .insert({
          coordinator_id: user.id,
          user_id: studentData.userId,
          class_id: studentData.classId,
          full_name: studentData.fullName,
          email: studentData.email,
          phone: studentData.phone,
          birth_date: studentData.birthDate,
          target_career: studentData.targetCareer,
          target_university: studentData.targetUniversity,
          current_grade: studentData.currentGrade,
          learning_style: studentData.learningStyle,
          study_methods: studentData.studyMethods,
          learning_pace: studentData.learningPace,
          special_needs: studentData.specialNeeds,
          academic_history: studentData.academicHistory,
          notes: studentData.notes,
        })
        .select()
        .single();

      if (!error && data) {
        const newStudent: Student = {
          id: data.id,
          userId: data.user_id,
          coordinatorId: data.coordinator_id,
          classId: data.class_id,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
          birthDate: data.birth_date,
          targetCareer: data.target_career,
          targetUniversity: data.target_university,
          currentGrade: data.current_grade,
          learningStyle: data.learning_style,
          studyMethods: data.study_methods,
          learningPace: data.learning_pace,
          specialNeeds: data.special_needs,
          academicHistory: data.academic_history,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setStudents(prev => [...prev, newStudent]);

        // Inicializar grade horária
        await initializeTimeGrid(data.id);
      }
    },
    [user]
  );

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    const { error } = await supabase
      .from('students')
      .update({
        class_id: updates.classId,
        full_name: updates.fullName,
        email: updates.email,
        phone: updates.phone,
        birth_date: updates.birthDate,
        target_career: updates.targetCareer,
        target_university: updates.targetUniversity,
        current_grade: updates.currentGrade,
        learning_style: updates.learningStyle,
        study_methods: updates.studyMethods,
        learning_pace: updates.learningPace,
        special_needs: updates.specialNeeds,
        academic_history: updates.academicHistory,
        notes: updates.notes,
      })
      .eq('id', id);

    if (!error) {
      setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    }
  }, []);

  const removeStudent = useCallback(async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== id));
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
        setTimeSlots([]);
      }
    }
  }, [selectedStudent]);

  const selectStudent = useCallback((student: Student | null) => {
    setSelectedStudent(student);
    if (student) {
      loadTimeGrid(student.id);
    } else {
      setTimeSlots([]);
    }
  }, []);

  // Time Grid
  const loadTimeGrid = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('time_grid')
      .select('*')
      .eq('student_id', studentId)
      .order('day_of_week')
      .order('start_time');

    if (data) {
      setTimeSlots(
        data.map((t: any) => ({
          id: t.id,
          studentId: t.student_id,
          dayOfWeek: t.day_of_week,
          startTime: t.start_time,
          status: t.status,
          customLabel: t.custom_label,
          color: t.color,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }))
      );
    }
  }, []);

  const updateTimeSlot = useCallback(async (slotId: string, updates: Partial<TimeSlot>) => {
    const { error } = await supabase
      .from('time_grid')
      .update({
        status: updates.status,
        custom_label: updates.customLabel,
        color: updates.color,
      })
      .eq('id', slotId);

    if (!error) {
      setTimeSlots(prev => prev.map(t => (t.id === slotId ? { ...t, ...updates } : t)));
    }
  }, []);

  const bulkUpdateTimeSlots = useCallback(async (updates: Partial<TimeSlot>[]) => {
    // Atualizar em lote
    for (const update of updates) {
      if (update.id) {
        await supabase
          .from('time_grid')
          .update({
            status: update.status,
            custom_label: update.customLabel,
            color: update.color,
          })
          .eq('id', update.id);
      }
    }

    // Atualizar estado local
    setTimeSlots(prev =>
      prev.map(slot => {
        const update = updates.find(u => u.id === slot.id);
        return update ? { ...slot, ...update } : slot;
      })
    );
  }, []);

  const initializeTimeGrid = useCallback(async (studentId: string) => {
    // Chamar função SQL para inicializar grade
    await supabase.rpc('initialize_time_grid', { p_student_id: studentId });
  }, []);

  // Class Time Templates
  const loadClassTemplates = useCallback(async (classId: string) => {
    const { data } = await supabase
      .from('class_time_templates')
      .select('*')
      .eq('class_id', classId)
      .order('day_of_week')
      .order('start_time');

    if (data) {
      setClassTemplates(
        data.map((t: any) => ({
          id: t.id,
          classId: t.class_id,
          dayOfWeek: t.day_of_week,
          startTime: t.start_time,
          label: t.label,
          color: t.color,
          status: t.status,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }))
      );
    }
  }, []);

  const addClassTemplate = useCallback(
    async (template: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('class_time_templates')
        .insert({
          class_id: template.classId,
          day_of_week: template.dayOfWeek,
          start_time: template.startTime,
          label: template.label,
          color: template.color,
          status: template.status,
        })
        .select()
        .single();

      if (!error && data) {
        setClassTemplates(prev => [
          ...prev,
          {
            id: data.id,
            classId: data.class_id,
            dayOfWeek: data.day_of_week,
            startTime: data.start_time,
            label: data.label,
            color: data.color,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        ]);
      }
    },
    []
  );

  const updateClassTemplate = useCallback(async (id: string, updates: Partial<ClassTimeTemplate>) => {
    const { error } = await supabase
      .from('class_time_templates')
      .update({
        label: updates.label,
        color: updates.color,
        status: updates.status,
      })
      .eq('id', id);

    if (!error) {
      setClassTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    }
  }, []);

  const removeClassTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('class_time_templates').delete().eq('id', id);

    if (!error) {
      setClassTemplates(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  const bulkAddClassTemplates = useCallback(
    async (templates: Omit<ClassTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const { data, error } = await supabase
        .from('class_time_templates')
        .insert(
          templates.map(t => ({
            class_id: t.classId,
            day_of_week: t.dayOfWeek,
            start_time: t.startTime,
            label: t.label,
            color: t.color,
            status: t.status,
          }))
        )
        .select();

      if (!error && data) {
        setClassTemplates(prev => [
          ...prev,
          ...data.map((t: any) => ({
            id: t.id,
            classId: t.class_id,
            dayOfWeek: t.day_of_week,
            startTime: t.start_time,
            label: t.label,
            color: t.color,
            status: t.status,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          })),
        ]);
      }
    },
    []
  );

  const copyClassTemplatesToStudent = useCallback(async (studentId: string, classId: string) => {
    // Chamar função SQL para copiar templates
    await supabase.rpc('copy_class_templates_to_student', {
      p_student_id: studentId,
      p_class_id: classId,
    });
    
    // Recarregar grade do aluno
    await loadTimeGrid(studentId);
  }, [loadTimeGrid]);

  return (
    <EducationalContext.Provider
      value={{
        classes,
        students,
        timeSlots,
        classTemplates,
        selectedStudent,
        loading,
        addClass,
        updateClass,
        removeClass,
        loadClassTemplates,
        addClassTemplate,
        updateClassTemplate,
        removeClassTemplate,
        bulkAddClassTemplates,
        addStudent,
        updateStudent,
        removeStudent,
        selectStudent,
        loadTimeGrid,
        updateTimeSlot,
        bulkUpdateTimeSlots,
        initializeTimeGrid,
        copyClassTemplatesToStudent,
        refreshData,
      }}
    >
      {children}
    </EducationalContext.Provider>
  );
};
