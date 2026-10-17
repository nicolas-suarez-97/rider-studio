import { NextRequest, NextResponse } from 'next/server';
import { REVIEW_HEADING, readReviewSuggestions } from '@/core/editor/review-message';
import { buildRiderReview } from '@/lib/importer/rider-audit';
import { Json } from '@/lib/supabase/database.types';
import { getChatMessages, getChatSessions, getOrCreateChatSession, saveChatMessage } from '@/lib/services/rider-storage';

const reviewInflight = new Map<string, Promise<unknown>>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      riderId?: string;
      sessionId?: string;
      title?: string;
      message?: string;
      suggestions?: unknown[];
      sections?: Array<{ id?: string; title?: string; content?: string }>;
    } | null;

    const riderId = typeof body?.riderId === 'string' ? body.riderId : undefined;
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
    const sections = Array.isArray(body?.sections)
      ? body.sections
          .filter((section) => section?.id && section.title)
          .map((section) => ({
            id: String(section.id),
            title: String(section.title),
            content: typeof section.content === 'string' ? section.content : '',
          }))
      : [];

    if (typeof body?.message === 'string' && body.message.includes(REVIEW_HEADING)) {
      const session = await getOrCreateChatSession(sessionId, riderId, 'Análisis del rider', 'master');
      const previous = await getChatMessages(session.id);
      const stored = previous.find((message) => (message.content || '').includes(REVIEW_HEADING));
      if (stored) {
        return NextResponse.json({
          ok: true,
          already: true,
          sessionId: session.id,
          message: stored.content,
          suggestions: readReviewSuggestions(stored.actions),
        });
      }
      const suggestions = Array.isArray(body.suggestions) ? body.suggestions : [];
      await saveChatMessage({
        sessionId: session.id,
        role: 'assistant',
        agentRole: 'master',
        roleName: 'Master Production Copilot',
        roleAvatar: '🧠',
        content: body.message.slice(0, 7900),
        actions: [{ kind: 'rider-review', suggestions: JSON.parse(JSON.stringify(suggestions)) }] as Json,
      });
      return NextResponse.json({ ok: true, already: false, sessionId: session.id, message: body.message, suggestions });
    }

    if (sections.length === 0) {
      return NextResponse.json({ ok: false, error: 'El documento no tiene secciones para revisar.' }, { status: 400 });
    }

    const lockKey = riderId || sessionId || '';
    if (lockKey && reviewInflight.has(lockKey)) {
      return NextResponse.json(await reviewInflight.get(lockKey));
    }

    const job = createReview({
      riderId,
      sessionId,
      title: typeof body?.title === 'string' ? body.title : '',
      sections,
    });
    if (lockKey) reviewInflight.set(lockKey, job);
    try {
      return NextResponse.json(await job);
    } finally {
      if (lockKey) reviewInflight.delete(lockKey);
    }
  } catch (error) {
    console.error('[POST /api/riders/review]', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo generar el análisis del rider.' },
      { status: 500 }
    );
  }
}

async function createReview(input: {
  riderId?: string;
  sessionId?: string;
  title: string;
  sections: Array<{ id: string; title: string; content: string }>;
}) {
  const { riderId, sessionId, sections } = input;
  const sessions = await getChatSessions();
  const linked = (sessionId && sessions.find((session) => session.id === sessionId))
    || (riderId ? sessions.find((session) => session.rider_id === riderId) : undefined);

  if (linked) {
    const previous = await getChatMessages(linked.id);
    const stored = previous.find((message) => (message.content || '').includes(REVIEW_HEADING));
    if (stored) {
      return {
        ok: true,
        already: true,
        sessionId: linked.id,
        message: stored.content,
        suggestions: readReviewSuggestions(stored.actions),
      };
    }
  }

  const review = await buildRiderReview({
    fileName: input.title.trim() || 'Rider',
    sections,
  });

  const suggestions = review.points.map((point, index) => ({
    id: `sug-review-${Date.now()}-${index}`,
    sectionId: point.sectionId,
    kind: 'insert' as const,
    baseText: '',
    proposedText: point.proposedText,
    rationale: point.rationale,
    status: 'pending' as const,
    source: 'agent' as const,
  }));

  const session = await getOrCreateChatSession(
    linked?.id || sessionId,
    riderId,
    'Análisis del rider',
    'master'
  );

  await saveChatMessage({
    sessionId: session.id,
    role: 'assistant',
    agentRole: 'master',
    roleName: 'Master Production Copilot',
    roleAvatar: '🧠',
    content: review.message,
    actions: [{ kind: 'rider-review', suggestions }] as Json,
  });

  return {
    ok: true,
    already: false,
    sessionId: session.id,
    message: review.message,
    auditScore: review.score,
    suggestions,
  };
}
