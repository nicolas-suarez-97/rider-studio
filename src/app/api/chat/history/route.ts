import { NextRequest, NextResponse } from 'next/server';
import {
  getChatMessages,
  getOrCreateChatSession,
  saveChatMessage
} from '@/lib/services/rider-storage';
import { SaveChatMessageSchema } from '@/lib/validations/chat.schema';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
    }

    const messages = await getChatMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error('[API Chat History GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = SaveChatMessageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de mensaje inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, role, agentRole, roleName, roleAvatar, content, actions } = parsed.data;

    const session = await getOrCreateChatSession(sessionId);
    const saved = await saveChatMessage({
      sessionId: session.id,
      role: role || 'user',
      agentRole: agentRole || null,
      roleName: roleName || null,
      roleAvatar: roleAvatar || null,
      content,
      actions: (actions || []) as unknown as Parameters<typeof saveChatMessage>[0]['actions']
    });

    return NextResponse.json({ message: saved, sessionId: session.id, success: true });
  } catch (error: unknown) {
    console.error('[API Chat History POST Error]', error);
    return NextResponse.json({ error: 'Error al guardar mensaje' }, { status: 500 });
  }
}
