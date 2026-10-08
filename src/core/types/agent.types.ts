export type AgentRole = 'master' | 'audio_foh' | 'hospitality' | 'security';

export interface AgentProfile {
  name: string;
  title: string;
  color: string;
  desc: string;
}

export interface InputChannelActionPayload {
  ch?: string;
  source?: string;
  name?: string;
  transducer?: string;
  mic?: string;
  stand?: string;
  insert?: string;
}

export interface UpdateSectionActionPayload {
  sectionId: string;
  note: string;
}

export type AgentActionPayload =
  | InputChannelActionPayload
  | UpdateSectionActionPayload
  | string
  | Record<string, unknown>;

export interface AgentAction {
  type: 'update_section' | 'add_input_channel' | 'update_backline' | 'switch_rider_type' | 'update_metadata';
  payload: AgentActionPayload;
}

export interface AgentResponse {
  sessionId?: string;
  role: AgentRole;
  roleName: string;
  roleAvatar: string;
  message: string;
  actions?: AgentAction[];
  gatewayProvider: 'vercel_ai_gateway' | 'production_expert_engine';
  notice?: string;
}
