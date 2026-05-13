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
    PostgrestVersion: "14.5"
  }
  neuralib: {
    Tables: {
      assets: {
        Row: {
          bytes: number | null
          card_id: string | null
          created_at: string
          filename: string
          id: string
          mime_type: string | null
          owner_id: string
          storage_path: string
        }
        Insert: {
          bytes?: number | null
          card_id?: string | null
          created_at?: string
          filename: string
          id?: string
          mime_type?: string | null
          owner_id: string
          storage_path: string
        }
        Update: {
          bytes?: number | null
          card_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          position: number
          role: string
          thread_id: string
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          position: number
          role: string
          thread_id: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position?: number
          role?: string
          thread_id?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          id: string
          model: string | null
          owner_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          owner_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          owner_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      card_embeddings: {
        Row: {
          card_id: string
          embedding: string
          model: string
          owner_id: string
          source_hash: string
          updated_at: string
        }
        Insert: {
          card_id: string
          embedding: string
          model?: string
          owner_id: string
          source_hash: string
          updated_at?: string
        }
        Update: {
          card_id?: string
          embedding?: string
          model?: string
          owner_id?: string
          source_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_embeddings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_links: {
        Row: {
          created_at: string
          id: string
          kind: Database["neuralib"]["Enums"]["link_kind"]
          note: string | null
          source_card_id: string
          target_card_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["neuralib"]["Enums"]["link_kind"]
          note?: string | null
          source_card_id: string
          target_card_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["neuralib"]["Enums"]["link_kind"]
          note?: string | null
          source_card_id?: string
          target_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_links_source_card_id_fkey"
            columns: ["source_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_links_target_card_id_fkey"
            columns: ["target_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_tags: {
        Row: {
          card_id: string
          tag_id: string
        }
        Insert: {
          card_id: string
          tag_id: string
        }
        Update: {
          card_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      card_versions: {
        Row: {
          card_id: string
          content: string
          created_at: string
          format: Database["neuralib"]["Enums"]["card_format"]
          id: string
          message: string | null
          version: number
        }
        Insert: {
          card_id: string
          content: string
          created_at?: string
          format: Database["neuralib"]["Enums"]["card_format"]
          id?: string
          message?: string | null
          version: number
        }
        Update: {
          card_id?: string
          content?: string
          created_at?: string
          format?: Database["neuralib"]["Enums"]["card_format"]
          id?: string
          message?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_versions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          content: string
          content_plain: string
          created_at: string
          format: Database["neuralib"]["Enums"]["card_format"]
          id: string
          owner_id: string
          search_vector: unknown
          slug: string
          status: Database["neuralib"]["Enums"]["card_status"]
          subject_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          content_plain?: string
          created_at?: string
          format?: Database["neuralib"]["Enums"]["card_format"]
          id?: string
          owner_id: string
          search_vector?: unknown
          slug: string
          status?: Database["neuralib"]["Enums"]["card_status"]
          subject_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_plain?: string
          created_at?: string
          format?: Database["neuralib"]["Enums"]["card_format"]
          id?: string
          owner_id?: string
          search_vector?: unknown
          slug?: string
          status?: Database["neuralib"]["Enums"]["card_status"]
          subject_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      composition_entries: {
        Row: {
          card_id: string | null
          composition_id: string
          heading_level: number | null
          heading_text: string | null
          id: string
          kind: Database["neuralib"]["Enums"]["entry_kind"]
          position: number
          raw_content: string | null
        }
        Insert: {
          card_id?: string | null
          composition_id: string
          heading_level?: number | null
          heading_text?: string | null
          id?: string
          kind?: Database["neuralib"]["Enums"]["entry_kind"]
          position: number
          raw_content?: string | null
        }
        Update: {
          card_id?: string | null
          composition_id?: string
          heading_level?: number | null
          heading_text?: string | null
          id?: string
          kind?: Database["neuralib"]["Enums"]["entry_kind"]
          position?: number
          raw_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composition_entries_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composition_entries_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      compositions: {
        Row: {
          cover_color: string | null
          created_at: string
          description: string | null
          id: string
          kind: Database["neuralib"]["Enums"]["composition_kind"]
          owner_id: string
          preface: string | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["neuralib"]["Enums"]["composition_kind"]
          owner_id: string
          preface?: string | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["neuralib"]["Enums"]["composition_kind"]
          owner_id?: string
          preface?: string | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exports: {
        Row: {
          bytes: number | null
          card_id: string | null
          composition_id: string | null
          content_hash: string | null
          created_at: string
          error: string | null
          format: string
          id: string
          owner_id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          bytes?: number | null
          card_id?: string | null
          composition_id?: string | null
          content_hash?: string | null
          created_at?: string
          error?: string | null
          format: string
          id?: string
          owner_id: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          bytes?: number | null
          card_id?: string | null
          composition_id?: string | null
          content_hash?: string | null
          created_at?: string
          error?: string | null
          format?: string
          id?: string
          owner_id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_cards: {
        Args: { lim?: number; q: string }
        Returns: {
          id: string
          rank: number
          snippet: string
          subject_id: string
          summary: string
          title: string
        }[]
      }
      search_cards_hybrid: {
        Args: { lim?: number; q: string; q_embedding: string }
        Returns: {
          id: string
          rank: number
          snippet: string
          subject_id: string
          summary: string
          title: string
        }[]
      }
      strip_tex: { Args: { src: string }; Returns: string }
    }
    Enums: {
      card_format: "latex_fragment" | "latex_doc"
      card_status: "draft" | "published" | "archived"
      composition_kind:
        | "textbook"
        | "cheatsheet"
        | "lecture"
        | "note_pack"
        | "custom"
      entry_kind: "card" | "heading" | "page_break" | "raw"
      link_kind: "depends_on" | "related" | "extends" | "cites"
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
  neuralib: {
    Enums: {
      card_format: ["latex_fragment", "latex_doc"],
      card_status: ["draft", "published", "archived"],
      composition_kind: [
        "textbook",
        "cheatsheet",
        "lecture",
        "note_pack",
        "custom",
      ],
      entry_kind: ["card", "heading", "page_break", "raw"],
      link_kind: ["depends_on", "related", "extends", "cites"],
    },
  },
} as const
