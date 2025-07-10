export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Field value conventions for field-set table:
 * - null: Unknown/missing data (not counted in field counts)
 * - "empty": Intentionally left empty (counted as filled field)
 * - any other string: Actual field content (counted as filled field)
 */
export type Database = {
  public: {
    Tables: {
      "book-input": {
        Row: {
          created_at: string;
          id: number;
          label: string | null;
          ocr_markdown: string | null;
          reference_markdown: string | null;
          correct_fields: number | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          label?: string | null;
          ocr_markdown?: string | null;
          reference_markdown?: string | null;
          correct_fields?: number | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          label?: string | null;
          ocr_markdown?: string | null;
          reference_markdown?: string | null;
          correct_fields?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "book-input_correct_fields_fkey";
            columns: ["correct_fields"];
            isOneToOne: false;
            referencedRelation: "field-set";
            referencedColumns: ["id"];
          }
        ];
      };
      "field-set": {
        Row: {
          copyright: string | null;
          created_at: string;
          id: number;
          title_l1: string | null;
          title_l2: string | null;
          license_url: string | null;
          isbn: string | null;
          licenseDescription: string | null;
          licenseNotes: string | null;
          originalCopyright: string | null;
          smallCoverCredits: string | null;
          topic: string | null;
          credits: string | null;
          versionAcknowledgments: string | null;
          originalContributions: string | null;
          originalAcknowledgments: string | null;
          funding: string | null;
          country: string | null;
          province: string | null;
          district: string | null;
          author: string | null;
          illustrator: string | null;
          publisher: string | null;
          originalPublisher: string | null;
        };
        Insert: {
          copyright?: string | null;
          created_at?: string;
          id?: number;
          title_l1?: string | null;
          title_l2?: string | null;
          license_url?: string | null;
          isbn?: string | null;
          licenseDescription?: string | null;
          licenseNotes?: string | null;
          originalCopyright?: string | null;
          smallCoverCredits?: string | null;
          topic?: string | null;
          credits?: string | null;
          versionAcknowledgments?: string | null;
          originalContributions?: string | null;
          originalAcknowledgments?: string | null;
          funding?: string | null;
          country?: string | null;
          province?: string | null;
          district?: string | null;
          author?: string | null;
          illustrator?: string | null;
          publisher?: string | null;
          originalPublisher?: string | null;
        };
        Update: {
          copyright?: string | null;
          created_at?: string;
          id?: number;
          title_l1?: string | null;
          title_l2?: string | null;
          license_url?: string | null;
          isbn?: string | null;
          licenseDescription?: string | null;
          licenseNotes?: string | null;
          originalCopyright?: string | null;
          smallCoverCredits?: string | null;
          topic?: string | null;
          credits?: string | null;
          versionAcknowledgments?: string | null;
          originalContributions?: string | null;
          originalAcknowledgments?: string | null;
          funding?: string | null;
          country?: string | null;
          province?: string | null;
          district?: string | null;
          author?: string | null;
          illustrator?: string | null;
          publisher?: string | null;
          originalPublisher?: string | null;
        };
        Relationships: [];
      };
      prompt: {
        Row: {
          created_at: string;
          id: number;
          label: string | null;
          notes: string | null;
          user_prompt: string | null;
          temperature: number | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          label?: string | null;
          notes?: string | null;
          user_prompt?: string | null;
          temperature?: number | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          label?: string | null;
          notes?: string | null;
          user_prompt?: string | null;
          temperature?: number | null;
        };
        Relationships: [];
      };
      run: {
        Row: {
          book_input_id: number | null;
          created_at: string;
          human_tags: string[] | null;
          id: number;
          notes: string | null;
          output: string | null;
          prompt_id: number | null;
          discovered_fields: number | null;
          model: string | null;
          temperature: number | null;
        };
        Insert: {
          book_input_id?: number | null;
          created_at?: string;
          human_tags?: string[] | null;
          id?: number;
          notes?: string | null;
          output?: string | null;
          prompt_id?: number | null;
          discovered_fields?: number | null;
          model?: string | null;
          temperature?: number | null;
        };
        Update: {
          book_input_id?: number | null;
          created_at?: string;
          human_tags?: string[] | null;
          id?: number;
          notes?: string | null;
          output?: string | null;
          prompt_id?: number | null;
          discovered_fields?: number | null;
          model?: string | null;
          temperature?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "run_book_input_id_fkey";
            columns: ["book_input_id"];
            isOneToOne: false;
            referencedRelation: "book-input";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_discovered_fields_fkey";
            columns: ["discovered_fields"];
            isOneToOne: false;
            referencedRelation: "field-set";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompt";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
