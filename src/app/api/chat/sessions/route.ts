import { NextRequest, NextResponse } from 'next/server';
import { getChatSessions, getOrCreateChatSession, updateChatSession, deleteChatSession } from '@/lib/services/rider-storage';

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, riderId, title, activeAgent } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de sesión requerido' }, { status: 400 });
    }

    const updated = await updateChatSession(id, { riderId, title, activeAgent });
    if (updated) {
      return NextResponse.json({ success: true, session: updated });
    }
    return NextResponse.json({ error: 'No se encontró la sesión a actualizar' }, { status: 404 });
  } catch (error: any) {
    console.error('[API Chat Sessions PATCH Error]', error);
    return NextResponse.json({ error: 'Error al actualizar la sesión' }, { status: 500 });
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
