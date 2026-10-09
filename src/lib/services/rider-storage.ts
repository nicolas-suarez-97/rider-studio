import {
  riderRepository,
  DbRider,
  DbRiderWithSessions,
  SaveRiderInput
} from '@/lib/repositories/rider.repository';
import { Json } from '@/lib/supabase/database.types';
import {
  chatRepository,
  DbChatSession,
  DbChatMessage,
  DbChatSessionWithRider,
  SaveChatMessageInput,
  UpdateChatSessionInput
} from '@/lib/repositories/chat.repository';

export type {
  DbRider,
  DbChatSession,
  DbChatMessage,
  DbRiderWithSessions,
  DbChatSessionWithRider
};

/**
 * Fachada para compatibilidad regresiva con la capa de persistencia desacoplada en Repositorios.
 */
export async function getRiders(): Promise<DbRiderWithSessions[]> {
  return riderRepository.getAll();
}

export async function getRiderById(id: string): Promise<DbRiderWithSessions | null> {
  return riderRepository.getById(id);
}

export async function getRiderByShareToken(token: string): Promise<DbRider | null> {
  return riderRepository.getByShareToken(token);
}

export async function publishRiderShare(id: string) {
  return riderRepository.publishShare(id);
}

export async function saveContraRider(id: string, contraRider: Json) {
  return riderRepository.saveContraRider(id, contraRider);
}

export async function saveRider(rider: SaveRiderInput): Promise<DbRider> {
  return riderRepository.save(rider);
}

export async function deleteRider(id: string): Promise<boolean> {
  return riderRepository.delete(id);
}

export async function getChatSessions(): Promise<DbChatSessionWithRider[]> {
  return chatRepository.getSessions();
}

export async function updateChatSession(
  id: string,
  updates: UpdateChatSessionInput
): Promise<DbChatSessionWithRider | null> {
  return chatRepository.updateSession(id, updates);
}

export async function getOrCreateChatSession(
  sessionId?: string,
  riderId?: string,
  title?: string,
  activeAgent?: string
): Promise<DbChatSession> {
  return chatRepository.getOrCreateSession(sessionId, riderId, title, activeAgent);
}

export async function openConsultChatSession(
  sessionId: string | undefined,
  riderId: string,
  title: string,
  activeAgent: string
): Promise<DbChatSession> {
  return chatRepository.openConsultSession(sessionId, riderId, title, activeAgent);
}

export async function deleteChatSession(id: string): Promise<boolean> {
  return chatRepository.deleteSession(id);
}

export async function saveChatMessage(params: SaveChatMessageInput): Promise<DbChatMessage> {
  return chatRepository.saveMessage(params);
}

export async function getChatMessages(sessionId: string): Promise<DbChatMessage[]> {
  return chatRepository.getMessages(sessionId);
}
