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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          seconds_taken: number
          section: string
          selected_index: number | null
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          seconds_taken?: number
          section: string
          selected_index?: number | null
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          seconds_taken?: number
          section?: string
          selected_index?: number | null
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_message_id: string | null
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          chapter: string
          content: Json
          created_at: string
          id: string
          section: string
          topic: string
          topic_slug: string
        }
        Insert: {
          chapter: string
          content: Json
          created_at?: string
          id?: string
          section: string
          topic: string
          topic_slug: string
        }
        Update: {
          chapter?: string
          content?: Json
          created_at?: string
          id?: string
          section?: string
          topic?: string
          topic_slug?: string
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
          created_at: string
          id: string
          paper_id: string
          score: number
          seconds: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paper_id: string
          score?: number
          seconds?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paper_id?: string
          score?: number
          seconds?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mock_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_papers: {
        Row: {
          created_at: string
          duration_min: number
          exam: string
          id: string
          kind: string
          pattern_key: string
          question_count: number
          section: string
          sort_order: number
          title: string
          topic_name: string | null
          topic_slug: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          duration_min?: number
          exam: string
          id?: string
          kind?: string
          pattern_key?: string
          question_count?: number
          section?: string
          sort_order?: number
          title: string
          topic_name?: string | null
          topic_slug?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          duration_min?: number
          exam?: string
          id?: string
          kind?: string
          pattern_key?: string
          question_count?: number
          section?: string
          sort_order?: number
          title?: string
          topic_name?: string | null
          topic_slug?: string | null
          year?: number | null
        }
        Relationships: []
      }
      mock_questions: {
        Row: {
          answer_text: string | null
          common_mistake: string | null
          correct_index: number | null
          created_at: string
          id: string
          options: Json | null
          paper_id: string
          passage: string | null
          position: number
          prompt: string
          qtype: string
          section: string
          solution: string
          topic: string | null
          trick: string | null
        }
        Insert: {
          answer_text?: string | null
          common_mistake?: string | null
          correct_index?: number | null
          created_at?: string
          id?: string
          options?: Json | null
          paper_id: string
          passage?: string | null
          position?: number
          prompt: string
          qtype?: string
          section?: string
          solution: string
          topic?: string | null
          trick?: string | null
        }
        Update: {
          answer_text?: string | null
          common_mistake?: string | null
          correct_index?: number | null
          created_at?: string
          id?: string
          options?: Json | null
          paper_id?: string
          passage?: string | null
          position?: number
          prompt?: string
          qtype?: string
          section?: string
          solution?: string
          topic?: string | null
          trick?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "mock_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          exam_date: string | null
          full_name: string
          id: string
          last_active_on: string | null
          streak: number
          target_college: string | null
          target_year: number
          updated_at: string
          xp: number
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          full_name?: string
          id: string
          last_active_on?: string | null
          streak?: number
          target_college?: string | null
          target_year?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          full_name?: string
          id?: string
          last_active_on?: string | null
          streak?: number
          target_college?: string | null
          target_year?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          common_mistake: string | null
          correct_index: number
          created_at: string
          difficulty: string
          id: string
          is_pyq: boolean
          options: Json
          passage: string | null
          prompt: string
          pyq_source: string | null
          section: string
          solution: string
          topic: string
          trick: string | null
        }
        Insert: {
          common_mistake?: string | null
          correct_index: number
          created_at?: string
          difficulty?: string
          id?: string
          is_pyq?: boolean
          options: Json
          passage?: string | null
          prompt: string
          pyq_source?: string | null
          section: string
          solution: string
          topic: string
          trick?: string | null
        }
        Update: {
          common_mistake?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string
          id?: string
          is_pyq?: boolean
          options?: Json
          passage?: string | null
          prompt?: string
          pyq_source?: string | null
          section?: string
          solution?: string
          topic?: string
          trick?: string | null
        }
        Relationships: []
      }
      topic_progress: {
        Row: {
          id: string
          practice_correct: number
          practice_total: number
          status: string
          topic_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          practice_correct?: number
          practice_total?: number
          status?: string
          topic_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          practice_correct?: number
          practice_total?: number
          status?: string
          topic_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_lessons: {
        Row: {
          chapter_name: string
          created_at: string
          id: string
          script: Json
          section: string
          title: string
          topic_name: string
          topic_slug: string
        }
        Insert: {
          chapter_name?: string
          created_at?: string
          id?: string
          script?: Json
          section?: string
          title?: string
          topic_name?: string
          topic_slug: string
        }
        Update: {
          chapter_name?: string
          created_at?: string
          id?: string
          script?: Json
          section?: string
          title?: string
          topic_name?: string
          topic_slug?: string
        }
        Relationships: []
      }
      vocab_progress: {
        Row: {
          id: string
          status: string
          updated_at: string
          user_id: string
          word_id: string
        }
        Insert: {
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          word_id: string
        }
        Update: {
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocab_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_words: {
        Row: {
          antonyms: string[]
          created_at: string
          enriched: boolean
          example: string
          examples: Json
          id: string
          level: string
          meaning: string
          other_meanings: Json
          part_of_speech: string | null
          root_hint: string | null
          synonyms: string[]
          word: string
        }
        Insert: {
          antonyms?: string[]
          created_at?: string
          enriched?: boolean
          example: string
          examples?: Json
          id?: string
          level?: string
          meaning: string
          other_meanings?: Json
          part_of_speech?: string | null
          root_hint?: string | null
          synonyms?: string[]
          word: string
        }
        Update: {
          antonyms?: string[]
          created_at?: string
          enriched?: boolean
          example?: string
          examples?: Json
          id?: string
          level?: string
          meaning?: string
          other_meanings?: Json
          part_of_speech?: string | null
          root_hint?: string | null
          synonyms?: string[]
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
