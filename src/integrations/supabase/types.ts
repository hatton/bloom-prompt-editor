export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      "book-input": {
        Row: {
          correct_fields: number | null
          created_at: string
          id: number
          label: string | null
          notes: string | null
          ocr_markdown: string | null
          reference_markdown: string | null
        }
        Insert: {
          correct_fields?: number | null
          created_at?: string
          id?: number
          label?: string | null
          notes?: string | null
          ocr_markdown?: string | null
          reference_markdown?: string | null
        }
        Update: {
          correct_fields?: number | null
          created_at?: string
          id?: number
          label?: string | null
          notes?: string | null
          ocr_markdown?: string | null
          reference_markdown?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book-input_correct_fields_fkey"
            columns: ["correct_fields"]
            isOneToOne: false
            referencedRelation: "field-set"
            referencedColumns: ["id"]
          },
        ]
      }
      "field-set": {
        Row: {
          author: string | null
          copyright: string | null
          country: string | null
          created_at: string
          credits: string | null
          district: string | null
          funding: string | null
          id: number
          illustrator: string | null
          isbn: string | null
          license_url: string | null
          licenseDescription: string | null
          licenseNotes: string | null
          originalAcknowledgments: string | null
          originalContributions: string | null
          originalCopyright: string | null
          originalPublisher: string | null
          province: string | null
          publisher: string | null
          smallCoverCredits: string | null
          title_l1: string | null
          title_l2: string | null
          topic: string | null
          versionAcknowledgments: string | null
        }
        Insert: {
          author?: string | null
          copyright?: string | null
          country?: string | null
          created_at?: string
          credits?: string | null
          district?: string | null
          funding?: string | null
          id?: number
          illustrator?: string | null
          isbn?: string | null
          license_url?: string | null
          licenseDescription?: string | null
          licenseNotes?: string | null
          originalAcknowledgments?: string | null
          originalContributions?: string | null
          originalCopyright?: string | null
          originalPublisher?: string | null
          province?: string | null
          publisher?: string | null
          smallCoverCredits?: string | null
          title_l1?: string | null
          title_l2?: string | null
          topic?: string | null
          versionAcknowledgments?: string | null
        }
        Update: {
          author?: string | null
          copyright?: string | null
          country?: string | null
          created_at?: string
          credits?: string | null
          district?: string | null
          funding?: string | null
          id?: number
          illustrator?: string | null
          isbn?: string | null
          license_url?: string | null
          licenseDescription?: string | null
          licenseNotes?: string | null
          originalAcknowledgments?: string | null
          originalContributions?: string | null
          originalCopyright?: string | null
          originalPublisher?: string | null
          province?: string | null
          publisher?: string | null
          smallCoverCredits?: string | null
          title_l1?: string | null
          title_l2?: string | null
          topic?: string | null
          versionAcknowledgments?: string | null
        }
        Relationships: []
      }
      prompt: {
        Row: {
          created_at: string
          id: number
          label: string | null
          notes: string | null
          temperature: number | null
          user_prompt: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          label?: string | null
          notes?: string | null
          temperature?: number | null
          user_prompt?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          label?: string | null
          notes?: string | null
          temperature?: number | null
          user_prompt?: string | null
        }
        Relationships: []
      }
      run: {
        Row: {
          book_input_id: number | null
          created_at: string
          discovered_fields: number | null
          finish_reason: string | null
          human_tags: string[] | null
          id: number
          model: string | null
          notes: string | null
          output: string | null
          prompt_id: number | null
          seconds_used: number | null
          temperature: number | null
          tokens_used: number | null
        }
        Insert: {
          book_input_id?: number | null
          created_at?: string
          discovered_fields?: number | null
          finish_reason?: string | null
          human_tags?: string[] | null
          id?: number
          model?: string | null
          notes?: string | null
          output?: string | null
          prompt_id?: number | null
          seconds_used?: number | null
          temperature?: number | null
          tokens_used?: number | null
        }
        Update: {
          book_input_id?: number | null
          created_at?: string
          discovered_fields?: number | null
          finish_reason?: string | null
          human_tags?: string[] | null
          id?: number
          model?: string | null
          notes?: string | null
          output?: string | null
          prompt_id?: number | null
          seconds_used?: number | null
          temperature?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "run_book_input_id_fkey"
            columns: ["book_input_id"]
            isOneToOne: false
            referencedRelation: "book-input"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_discovered_fields_fkey"
            columns: ["discovered_fields"]
            isOneToOne: false
            referencedRelation: "field-set"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
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
