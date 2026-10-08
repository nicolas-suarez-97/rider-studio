import { NextRequest, NextResponse } from 'next/server';
import {
  getChatMessages,
  getOrCreateChatSession,
  saveChatMessage
} from '@/lib/services/rider-storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
    }

    const messages = await getChatMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('[API Chat History GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, role, agentRole, roleName, roleAvatar, content, actions } = body;

    if (!content) {
      return NextResponse.json({ error: 'El contenido del mensaje es requerido' }, { status: 400 });
    }

    const session = await getOrCreateChatSession(sessionId);
    const saved = await saveChatMessage({
      sessionId: session.id,
      role: role || 'user',
      agentRole,
      roleName,
      roleAvatar,
      content,
      actions: actions || []
    });

    return NextResponse.json({ message: saved, sessionId: session.id, success: true });
  } catch (error: any) {
    console.error('[API Chat History POST Error]', error);
    return NextResponse.json({ error: 'Error al guardar mensaje' }, { status: 500 });
  }
}
