import { NextRequest, NextResponse } from 'next/server';
import {
  getChatSessions,
  getOrCreateChatSession,
  updateChatSession,
  deleteChatSession
} from '@/lib/services/rider-storage';
import {
  CreateChatSessionSchema,
  UpdateChatSessionSchema
} from '@/lib/validations/chat.schema';

export async function GET() {
  try {
    const sessions = await getChatSessions();
    return NextResponse.json({ sessions });
  } catch (error: unknown) {
    console.error('[API Chat Sessions GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener las sesiones de chat' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = CreateChatSessionSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de sesión inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, riderId, activeAgent } = parsed.data;
    const session = await getOrCreateChatSession(
      undefined,
      riderId || undefined,
      title || 'Nueva Consulta de Producción',
      activeAgent || 'master'
    );
    return NextResponse.json({ session });
  } catch (error: unknown) {
    console.error('[API Chat Sessions POST Error]', error);
    return NextResponse.json({ error: 'Error al crear la sesión de chat' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = UpdateChatSessionSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de actualización inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { id, riderId, title, activeAgent } = parsed.data;

    const updated = await updateChatSession(id, { riderId, title, activeAgent });
    if (updated) {
      return NextResponse.json({ success: true, session: updated });
    }
    return NextResponse.json({ error: 'No se encontró la sesión a actualizar' }, { status: 404 });
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('[API Chat Sessions DELETE Error]', error);
    return NextResponse.json({ error: 'Error al eliminar la sesión' }, { status: 500 });
  }
}
