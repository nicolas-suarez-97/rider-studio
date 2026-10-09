import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { askPromotorAssistant, clearPromotorFile, reviewPromotorFile } from '@/lib/promotor/assistant';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MessageSchema = z.object({
  messages: z.array(z.object({
    role: z.string().optional(),
    content: z.string().max(8000).optional(),
    text: z.string().max(8000).optional(),
  })).max(30).default([]),
  activeAgent: z.enum(['master', 'audio_foh', 'hospitality', 'security']).optional(),
  sessionId: z.string().optional(),
  intent: z.enum(['message', 'clear']).optional().default('message'),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await context.params;
    if (!UUID_PATTERN.test(showId)) return jsonError('Show inválido', 400);

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return jsonError('Adjunta el contra-rider.', 400);
      const sessionId = form.get('sessionId');
      const result = await reviewPromotorFile({
        showId,
        file,
        agent: form.get('activeAgent'),
        sessionId: typeof sessionId === 'string' && sessionId ? sessionId : undefined,
      });
      if (!result.ok) return jsonError(result.error, result.status);
      return NextResponse.json(result.payload);
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = MessageSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError('Datos de mensaje inválidos', 400);

    const result = parsed.data.intent === 'clear'
      ? await clearPromotorFile(showId)
      : await askPromotorAssistant({
          showId,
          messages: parsed.data.messages,
          agent: parsed.data.activeAgent,
          sessionId: parsed.data.sessionId,
        });

    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json(result.payload);
  } catch (error: unknown) {
    console.error('[API Promotor chat]', error instanceof Error ? error.message : 'error');
    return jsonError('No se pudo consultar el rider', 500);
  }
}
