import { NextRequest, NextResponse } from 'next/server';
import { getRiders, saveRider } from '@/lib/services/rider-storage';

export async function GET() {
  try {
    const riders = await getRiders();
    return NextResponse.json({ riders });
  } catch (error: any) {
    console.error('[API Riders GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener los riders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.artist_name) {
      return NextResponse.json(
        { error: 'Título y nombre del artista son requeridos' },
        { status: 400 }
      );
    }

    const saved = await saveRider(body);
    return NextResponse.json({ rider: saved, success: true });
  } catch (error: any) {
    console.error('[API Riders POST Error]', error);
    return NextResponse.json({ error: 'Error al guardar el rider' }, { status: 500 });
  }
}
