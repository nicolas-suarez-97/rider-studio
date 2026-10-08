import { AgentRole } from '../types/agent.types';
import { ChatMessageItem, ChatSessionSummary } from '../types/chat.types';

export class ChatMessage implements ChatMessageItem {
  constructor(
    public text: string,
    public sender: 'ai' | 'user' = 'user',
    public time: string = '',
    public role?: AgentRole,
    public roleName?: string,
    public roleAvatar?: string,
    public id?: string
  ) {}

  public static fromApi(data: {
    content?: string;
    text?: string;
    role?: string;
    created_at?: string;
    agent_role?: AgentRole;
    role_name?: string;
    role_avatar?: string;
    id?: string;
  }): ChatMessage {
    const formattedTime = data.created_at
      ? new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return new ChatMessage(
      data.content || data.text || '',
      (data.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
      formattedTime,
      data.agent_role || 'master',
      data.role_name || 'Agente de Producción',
      data.role_avatar || '🧠',
      data.id
    );
  }
}

export class ChatSession {
  public id: string;
  public title: string;
  public riderId?: string;
  public activeAgent: AgentRole;
  public messages: ChatMessage[];
  public updatedAt: string;

  constructor(params: {
    id: string;
    title: string;
    riderId?: string;
    activeAgent?: AgentRole;
    messages?: ChatMessage[];
    updatedAt?: string;
  }) {
    this.id = params.id;
    this.title = params.title || 'Nueva Consulta';
    this.riderId = params.riderId;
    this.activeAgent = params.activeAgent || 'master';
    this.messages = params.messages || [];
    this.updatedAt = params.updatedAt || '';
  }

  public addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.updatedAt = new Date().toISOString();
  }

  public toSummary(isActive = false): ChatSessionSummary {
    return {
      id: this.id,
      title: this.title,
      date: new Date(this.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      active: isActive,
      riderId: this.riderId,
      lastMessage: this.messages[this.messages.length - 1]?.text
    };
  }
}
