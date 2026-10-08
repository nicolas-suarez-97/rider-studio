import { NextRequest, NextResponse } from 'next/server';
import { getRiders, getRiderById, saveRider, deleteRider } from '@/lib/services/rider-storage';
import { SaveRiderPayloadSchema } from '@/lib/validations/rider.schema';
import { Json } from '@/lib/supabase/database.types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const rider = await getRiderById(id);
      if (!rider) {
        return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ rider });
    }

    const riders = await getRiders();
    return NextResponse.json({ riders });
  } catch (error: unknown) {
    console.error('[API Riders GET Error]', error);
    return NextResponse.json({ error: 'Error al obtener los riders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    
    // Fallback amigable si vienen vacíos
    if (!rawBody.title || typeof rawBody.title !== 'string' || rawBody.title.trim() === '') {
      rawBody.title = 'Rider de Producción';
    }
    if (!rawBody.artist_name || typeof rawBody.artist_name !== 'string' || rawBody.artist_name.trim() === '') {
      rawBody.artist_name = 'Nuevo Artista / Banda';
    }

    const parsed = SaveRiderPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de rider inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const saved = await saveRider({
      ...parsed.data,
      channels: parsed.data.channels as Json,
      sections: parsed.data.sections as Json,
      metadata: parsed.data.metadata as Json
    });
    return NextResponse.json({ rider: saved, success: true });
  } catch (error: unknown) {
    console.error('[API Riders POST Error]', error);
    return NextResponse.json({ error: 'Error al guardar el rider' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await deleteRider(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API Riders DELETE Error]', error);
    return NextResponse.json({ error: 'Error al eliminar el rider' }, { status: 500 });
  }
}
