import { NextRequest, NextResponse } from 'next/server';
import { persistContraRider } from '@/lib/promotor/load-show';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await context.params;
    if (!UUID_PATTERN.test(showId)) {
      return NextResponse.json({ error: 'Show inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const intent = body.intent === 'send' ? 'send' : 'draft';
    const result = await persistContraRider(showId, intent, body.answers);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ contra: result.contra });
  } catch (error: unknown) {
    console.error('[API Contra-rider PUT]', error);
    return NextResponse.json({ error: 'No se pudo guardar el contra-rider' }, { status: 500 });
  }
}
