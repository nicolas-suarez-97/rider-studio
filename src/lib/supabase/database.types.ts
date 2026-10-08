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
      };
      chat_sessions: {
        Row: {
          id: string;
          rider_id: string | null;
          title: string;
          active_agent: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rider_id?: string | null;
          title?: string;
          active_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rider_id?: string | null;
          title?: string;
          active_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
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
      };
    };
  };
}
