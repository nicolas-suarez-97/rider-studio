export type AgentRole = 'master' | 'audio_foh' | 'hospitality' | 'security';

export interface AgentProfile {
  name: string;
  title: string;
  color: string;
  desc: string;
}

export interface AgentAction {
  type: 'update_section' | 'add_input_channel' | 'update_backline' | 'switch_rider_type' | 'update_metadata';
  payload: any;
}

export interface AgentResponse {
  role: AgentRole;
  roleName: string;
  roleAvatar: string;
  message: string;
  actions?: AgentAction[];
  gatewayProvider: 'vercel_ai_gateway' | 'production_expert_engine';
  notice?: string;
}
