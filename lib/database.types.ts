export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          name: string | null;
          picture: string | null;
          subscription_tier: string;
          generation_credits: number;
          tokens_used: number;
          tokens_this_month: number;
          token_limit: number;
          project_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          name?: string | null;
          picture?: string | null;
          subscription_tier?: string;
          generation_credits?: number;
          tokens_used?: number;
          tokens_this_month?: number;
          token_limit?: number;
          project_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          name?: string | null;
          picture?: string | null;
          subscription_tier?: string;
          generation_credits?: number;
          tokens_used?: number;
          tokens_this_month?: number;
          token_limit?: number;
          project_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          seed_keyword: string;
          description: string | null;
          genre: string;
          target_audience: string;
          writing_style: string;
          cover_style: string;
          word_count_goal: number;
          status: string;
          tone_voice_settings: Json;
          current_step: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          seed_keyword: string;
          description?: string | null;
          genre?: string;
          target_audience?: string;
          writing_style?: string;
          cover_style?: string;
          word_count_goal?: number;
          status?: string;
          tone_voice_settings?: Json;
          current_step?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          seed_keyword?: string;
          description?: string | null;
          genre?: string;
          target_audience?: string;
          writing_style?: string;
          cover_style?: string;
          word_count_goal?: number;
          status?: string;
          tone_voice_settings?: Json;
          current_step?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      book_concepts: {
        Row: {
          id: string;
          project_id: string;
          thesis_statement: string | null;
          brainstorm_map: Json;
          concepts_json: Json;
          selected_title: string | null;
          selected_tagline: string | null;
          selected_description: string | null;
          market_positioning: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          thesis_statement?: string | null;
          brainstorm_map?: Json;
          concepts_json?: Json;
          selected_title?: string | null;
          selected_tagline?: string | null;
          selected_description?: string | null;
          market_positioning?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          thesis_statement?: string | null;
          brainstorm_map?: Json;
          concepts_json?: Json;
          selected_title?: string | null;
          selected_tagline?: string | null;
          selected_description?: string | null;
          market_positioning?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      chapters: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          order_index: number;
          summary_context: string | null;
          sections: Json;
          content_markdown: string | null;
          target_word_count: number;
          word_count: number;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          order_index: number;
          summary_context?: string | null;
          sections?: Json;
          content_markdown?: string | null;
          target_word_count?: number;
          word_count?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          order_index?: number;
          summary_context?: string | null;
          sections?: Json;
          content_markdown?: string | null;
          target_word_count?: number;
          word_count?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      cover_designs: {
        Row: {
          id: string;
          project_id: string;
          image_prompt: string | null;
          image_url: string | null;
          storage_path: string | null;
          style_variant: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          image_prompt?: string | null;
          image_url?: string | null;
          storage_path?: string | null;
          style_variant: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          image_prompt?: string | null;
          image_url?: string | null;
          storage_path?: string | null;
          style_variant?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
    Functions: {
      increment_token_usage: {
        Args: {
          p_user_id: string;
          p_tokens: number;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
