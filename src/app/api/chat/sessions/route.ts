import { NextRequest, NextResponse } from 'next/server';
import { getChatSessions, getOrCreateChatSession, deleteChatSession } from '@/lib/services/rider-storage';

export async function GET() {
  try {
    const sessions = await getChatSessions();
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('[API Chat Sessions GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener las sesiones de chat' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, riderId, activeAgent } = body;
    const session = await getOrCreateChatSession(
      undefined,
      riderId,
      title || 'Nueva Consulta de Producción',
      activeAgent || 'master'
    );
    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('[API Chat Sessions POST Error]', error);
    return NextResponse.json({ error: 'Error al crear la sesión de chat' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de sesión requerido' }, { status: 400 });
    }

    const ok = await deleteChatSession(id);
    if (ok) {
      return NextResponse.json({ success: true, id });
    }
    return NextResponse.json({ error: 'No se pudo eliminar la sesión' }, { status: 500 });
  } catch (error: any) {
    console.error('[API Chat Sessions DELETE Error]', error);
    return NextResponse.json({ error: 'Error al eliminar la sesión' }, { status: 500 });
  }
}
