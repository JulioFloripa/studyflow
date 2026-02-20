export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      class_time_templates: {
        Row: {
          class_id: string
          color: string | null
          created_at: string
          day_of_week: number
          id: string
          label: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          class_id: string
          color?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          label?: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          color?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          label?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_time_templates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          coordinator_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          semester: number | null
          updated_at: string
          year: number
        }
        Insert: {
          coordinator_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          semester?: number | null
          updated_at?: string
          year?: number
        }
        Update: {
          coordinator_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          semester?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      imported_presets: {
        Row: {
          id: string
          imported_at: string
          preset_id: string
          user_id: string
        }
        Insert: {
          id?: string
          imported_at?: string
          preset_id: string
          user_id: string
        }
        Update: {
          id?: string
          imported_at?: string
          preset_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: Json
          created_at: string
          exam_date: string | null
          id: string
          name: string
          objective: string
          review_intervals: Json
          unlocked_badges: string[] | null
          updated_at: string
          weekly_goal_hours: number
        }
        Insert: {
          availability?: Json
          created_at?: string
          exam_date?: string | null
          id: string
          name?: string
          objective?: string
          review_intervals?: Json
          unlocked_badges?: string[] | null
          updated_at?: string
          weekly_goal_hours?: number
        }
        Update: {
          availability?: Json
          created_at?: string
          exam_date?: string | null
          id?: string
          name?: string
          objective?: string
          review_intervals?: Json
          unlocked_badges?: string[] | null
          updated_at?: string
          weekly_goal_hours?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          completed: boolean
          completed_date: string | null
          created_at: string
          ease_factor: number | null
          id: string
          minutes_spent: number | null
          next_interval: number | null
          original_session_id: string | null
          questions_correct: number | null
          questions_total: number | null
          scheduled_date: string
          subject_id: string
          topic_id: string
          type: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          ease_factor?: number | null
          id?: string
          minutes_spent?: number | null
          next_interval?: number | null
          original_session_id?: string | null
          questions_correct?: number | null
          questions_total?: number | null
          scheduled_date: string
          subject_id: string
          topic_id: string
          type?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          ease_factor?: number | null
          id?: string
          minutes_spent?: number | null
          next_interval?: number | null
          original_session_id?: string | null
          questions_correct?: number | null
          questions_total?: number | null
          scheduled_date?: string
          subject_id?: string
          topic_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_original_session_id_fkey"
            columns: ["original_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_history: Json | null
          birth_date: string | null
          class_id: string | null
          coordinator_id: string
          created_at: string
          current_grade: string | null
          email: string | null
          full_name: string
          id: string
          learning_pace: string | null
          learning_style: Json | null
          notes: string | null
          phone: string | null
          special_needs: string | null
          study_methods: string[] | null
          target_career: string | null
          target_university: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          academic_history?: Json | null
          birth_date?: string | null
          class_id?: string | null
          coordinator_id: string
          created_at?: string
          current_grade?: string | null
          email?: string | null
          full_name: string
          id?: string
          learning_pace?: string | null
          learning_style?: Json | null
          notes?: string | null
          phone?: string | null
          special_needs?: string | null
          study_methods?: string[] | null
          target_career?: string | null
          target_university?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          academic_history?: Json | null
          birth_date?: string | null
          class_id?: string | null
          coordinator_id?: string
          created_at?: string
          current_grade?: string | null
          email?: string | null
          full_name?: string
          id?: string
          learning_pace?: string | null
          learning_style?: Json | null
          notes?: string | null
          phone?: string | null
          special_needs?: string | null
          study_methods?: string[] | null
          target_career?: string | null
          target_university?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_cycle: {
        Row: {
          created_at: string
          id: string
          minutes_suggested: number
          sort_order: number
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes_suggested?: number
          sort_order?: number
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes_suggested?: number
          sort_order?: number
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_cycle_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes_studied: number
          notes: string
          pages_read: number
          questions_correct: number
          questions_total: number
          subject_id: string
          topic_id: string
          user_id: string
          videos_watched: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          minutes_studied?: number
          notes?: string
          pages_read?: number
          questions_correct?: number
          questions_total?: number
          subject_id: string
          topic_id: string
          user_id: string
          videos_watched?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes_studied?: number
          notes?: string
          pages_read?: number
          questions_correct?: number
          questions_total?: number
          subject_id?: string
          topic_id?: string
          user_id?: string
          videos_watched?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          priority: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          priority?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          priority?: number
          user_id?: string
        }
        Relationships: []
      }
      time_grid: {
        Row: {
          color: string | null
          created_at: string
          custom_label: string | null
          day_of_week: number
          id: string
          inherited_from_class: boolean | null
          start_time: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          custom_label?: string | null
          day_of_week: number
          id?: string
          inherited_from_class?: boolean | null
          start_time: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          custom_label?: string | null
          day_of_week?: number
          id?: string
          inherited_from_class?: boolean | null
          start_time?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_grid_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          subject_id: string
          tags: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          subject_id: string
          tags?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          subject_id?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copy_class_templates_to_student: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: undefined
      }
      initialize_time_grid: {
        Args: { p_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
