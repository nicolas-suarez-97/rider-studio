import { ChatMessage } from '../models/ChatConversation';
import { ChatSessionSummary } from '../types/chat.types';
import { AgentRole } from '../types/agent.types';
import { RiderType } from '../types/rider.types';

export interface SendMessageParams {
  messages: Array<{ role?: string; content?: string; text?: string; sender?: string }>;
  riderType: RiderType;
  activeAgent: AgentRole;
  sessionId?: string;
  riderId?: string;
}

export interface IChatService {
  getSessions(): Promise<ChatSessionSummary[]>;
  createSession(params?: { title?: string; riderId?: string; activeAgent?: string }): Promise<ChatSessionSummary>;
  getHistory(sessionId: string): Promise<ChatMessage[]>;
  sendMessage(params: SendMessageParams): Promise<any>;
  deleteSession(sessionId: string): Promise<boolean>;
  linkRider(sessionId: string, riderId: string | null): Promise<boolean>;
}

export class ChatService implements IChatService {
  public async getSessions(): Promise<ChatSessionSummary[]> {
    try {
      const res = await fetch('/api/chat/sessions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.sessions)) {
        return data.sessions.map((s: any, idx: number) => ({
          id: s.id,
          title: s.title || 'Consulta de Producción',
          date: new Date(s.updated_at || s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          active: idx === 0,
          riderId: s.rider_id || null,
          riderInfo: s.riders ? {
            id: s.riders.id,
            title: s.riders.title,
            artistName: s.riders.artist_name,
            riderType: s.riders.rider_type
          } : null
        }));
      }
      return [];
    } catch (err) {
      console.warn('[ChatService.getSessions] Error:', err);
      return [];
    }
  }

  public async linkRider(sessionId: string, riderId: string | null): Promise<boolean> {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, riderId })
      });
      return res.ok;
    } catch (err) {
      console.error(`[ChatService.linkRider] Error for ${sessionId}:`, err);
      return false;
    }
  }

  public async createSession(params?: { title?: string; riderId?: string; activeAgent?: string }): Promise<ChatSessionSummary> {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const s = data.session;
      return {
        id: s.id,
        title: s.title || 'Nueva Consulta de Producción',
        date: new Date(s.updated_at || s.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        active: true,
        riderId: s.rider_id || null,
        riderInfo: s.riders ? {
          id: s.riders.id,
          title: s.riders.title,
          artistName: s.riders.artist_name,
          riderType: s.riders.rider_type
        } : null
      };
    } catch (err) {
      console.error('[ChatService.createSession] Error:', err);
      const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
      return {
        id: fallbackId,
        title: params?.title || 'Nueva Consulta de Producción',
        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        active: true,
        riderId: params?.riderId
      };
    }
  }

  public async getHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        return data.messages.map((m: any) => ChatMessage.fromApi(m));
      }
      return [];
    } catch (err) {
      console.warn(`[ChatService.getHistory] Error for session ${sessionId}:`, err);
      return [];
    }
  }

  public async sendMessage(params: SendMessageParams): Promise<any> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      throw new Error(`Chat API error: ${res.status}`);
    }

    return await res.json();
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/chat/sessions?id=${sessionId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error(`[ChatService.deleteSession] Error for ${sessionId}:`, err);
      return false;
    }
  }
}

export const chatService = new ChatService();
