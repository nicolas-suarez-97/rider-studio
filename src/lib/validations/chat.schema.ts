import { z } from 'zod';

export const AgentRoleSchema = z.enum(['master', 'audio_foh', 'hospitality', 'security']);
export const RiderTypeSchema = z.enum(['tecnico', 'hospitality', 'seguridad']);

export const ChatMessageInputSchema = z.object({
  role: z.string().optional().default('user'),
  content: z.string().max(8000, 'El mensaje excede el límite de seguridad de 8000 caracteres').optional(),
  text: z.string().max(8000, 'El mensaje excede el límite de seguridad de 8000 caracteres').optional()
});

export const SendChatMessageSchema = z.object({
  messages: z.array(ChatMessageInputSchema).default([]),
  riderType: RiderTypeSchema.optional().default('tecnico'),
  activeAgent: AgentRoleSchema.optional().default('master'),
  sessionId: z.string().optional(),
  riderId: z.string().optional()
});

export const CreateChatSessionSchema = z.object({
  title: z.string().max(255).optional(),
  riderId: z.string().uuid().nullable().optional(),
  activeAgent: AgentRoleSchema.optional().default('master')
});

export const UpdateChatSessionSchema = z.object({
  id: z.string().min(1, 'El ID de sesión es requerido'),
  riderId: z.string().nullable().optional(),
  title: z.string().max(255).optional(),
  activeAgent: AgentRoleSchema.optional()
});

export const SaveChatMessageSchema = z.object({
  sessionId: z.string().min(1, 'sessionId es requerido'),
  role: z.enum(['user', 'assistant', 'system']).optional().default('user'),
  agentRole: z.string().nullable().optional(),
  roleName: z.string().nullable().optional(),
  roleAvatar: z.string().nullable().optional(),
  content: z.string().min(1, 'El contenido es requerido').max(8000),
  actions: z.array(z.record(z.string(), z.unknown())).optional().default([])
});

export type SendChatMessagePayload = z.infer<typeof SendChatMessageSchema>;
export type CreateChatSessionPayload = z.infer<typeof CreateChatSessionSchema>;
export type UpdateChatSessionPayload = z.infer<typeof UpdateChatSessionSchema>;
export type SaveChatMessagePayload = z.infer<typeof SaveChatMessageSchema>;
