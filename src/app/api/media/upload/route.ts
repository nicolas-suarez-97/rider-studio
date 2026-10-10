import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { GALLERY_MAX_BYTES, PLOT_MAX_BYTES, imageKindFromPath } from '@/lib/media/rider-media';

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Falta el Blob store público de Vercel. Agrega BLOB_READ_WRITE_TOKEN.' },
      { status: 503 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const kind = imageKindFromPath(pathname);
        if (!kind) {
          throw new Error('Ruta de archivo no permitida');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: kind === 'plot' ? PLOT_MAX_BYTES : GALLERY_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo preparar la subida';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
