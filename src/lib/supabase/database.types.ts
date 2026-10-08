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
      riders: {
        Row: {
          id: string;
          user_id?: string | null;
          title: string;
          artist_name: string;
          rider_type: string;
          venue_name: string | null;
          event_date: string | null;
          version: string;
          status: string;
          channels: Json;
          sections: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          artist_name: string;
          rider_type?: string;
          venue_name?: string | null;
          event_date?: string | null;
          version?: string;
          status?: string;
          channels?: Json;
          sections?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          artist_name?: string;
          rider_type?: string;
          venue_name?: string | null;
          event_date?: string | null;
          version?: string;
          status?: string;
          channels?: Json;
          sections?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id?: string | null;
          rider_id: string | null;
          title: string;
          active_agent: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          rider_id?: string | null;
          title?: string;
          active_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          rider_id?: string | null;
          title?: string;
          active_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_rider_id_fkey";
            columns: ["rider_id"];
            isOneToOne: false;
            referencedRelation: "riders";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: string;
          agent_role: string | null;
          role_name: string | null;
          role_avatar: string | null;
          content: string;
          actions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: string;
          agent_role?: string | null;
          role_name?: string | null;
          role_avatar?: string | null;
          content: string;
          actions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: string;
          agent_role?: string | null;
          role_name?: string | null;
          role_avatar?: string | null;
          content?: string;
          actions?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
