import { NextResponse } from 'next/server';
import { getChatSessions } from '@/lib/services/rider-storage';

export async function GET() {
  try {
    const sessions = await getChatSessions();
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('[API Chat Sessions GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener las sesiones de chat' }, { status: 500 });
  }
}
