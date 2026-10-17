import { callAiCompletion } from '@/lib/ai/ai-provider';
import {
  composeReviewMessage,
  localReviewPoints,
  mergeReviewPoints,
  type ReviewPoint,
  type ReviewSectionInput,
} from '@/core/editor/review-message';

interface AiAuditSuggestion {
  sectionId?: string;
  kind?: 'insert' | 'replace' | 'add_channel' | 'add_section';
  baseText?: string;
  proposedText?: string;
  rationale?: string;
  newSectionTitle?: string;
}

interface AiAuditPayload {
  auditScore?: number;
  auditSummary?: string;
  suggestions?: AiAuditSuggestion[];
}

const AUDIT_PROMPT = `Eres el Master Production Copilot de Rider Studio.
El rider ya está importado en el editor. Tu única tarea es auditarlo y proponer mejoras concretas para mostrarlas en el chat.
Responde ÚNICAMENTE con JSON válido:
{
  "auditScore": 82,
  "auditSummary": "Dos o tres frases en español: qué tan completo está el rider, qué está bien resuelto y qué conviene reforzar.",
  "suggestions": [
    {
      "sectionId": "id-exacto-de-la-lista",
      "kind": "insert",
      "baseText": "",
      "proposedText": "Cláusula lista para insertar, en el idioma del rider",
      "rationale": "Por qué este cambio mejora el rider, en español y en una frase."
    }
  ]
}
Reglas:
1. Devuelve entre 3 y 5 sugerencias. Cada una tiene que señalar un hueco real del texto, no un consejo genérico.
2. Usa solo sectionId de la lista que te pasamos.
3. proposedText va en el idioma del documento. rationale y auditSummary van en español.
4. No repitas cláusulas que el rider ya dice con claridad.
5. Responde JSON puro, sin markdown.`;

function sectionSample(sections: ReviewSectionInput[]): string {
  return sections
    .filter((section) => section.id !== 'doc-cover')
    .map((section) => {
      const body = (section.content || '').replace(/\s+/g, ' ').trim().slice(0, 900);
      return `## ${section.title} (id: ${section.id})\n${body || '(vacía)'}`;
    })
    .join('\n\n')
    .slice(0, 18000);
}

export async function buildRiderReview(input: {
  fileName: string;
  sections: ReviewSectionInput[];
}): Promise<{
  score: number;
  summary: string;
  message: string;
  points: ReviewPoint[];
}> {
  const outline = input.sections
    .filter((section) => section.id !== 'doc-cover')
    .map((section) => `- ID: "${section.id}" | Título: "${section.title}"`)
    .join('\n');
  const validIds = new Set(input.sections.map((section) => section.id));
  const fallbackSection = input.sections.find((section) => section.id !== 'doc-cover') || input.sections[0];

  let score = 78;
  let summary = 'El documento ya tiene estructura de rider y todavía puede precisar cláusulas que el promotor tiene que cumplir.';
  let aiPoints: ReviewPoint[] = [];

  const aiResult = await callAiCompletion({
    messages: [
      { role: 'system', content: AUDIT_PROMPT },
      {
        role: 'user',
        content:
          `Archivo: "${input.fileName}"\n\n=== SECCIONES ===\n${outline}\n\n=== CONTENIDO ===\n${sectionSample(input.sections)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1800,
    jsonMode: true,
  });

  if (aiResult?.content) {
    try {
      const clean = aiResult.content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(clean) as AiAuditPayload;
      if (typeof parsed.auditScore === 'number' && parsed.auditScore >= 0 && parsed.auditScore <= 100) {
        score = Math.round(parsed.auditScore);
      }
      if (parsed.auditSummary?.trim()) summary = parsed.auditSummary.trim();
      aiPoints = (parsed.suggestions || [])
        .filter((item) => item?.proposedText?.trim() && item.rationale?.trim())
        .slice(0, 5)
        .map((item) => ({
          sectionId: item.sectionId && validIds.has(item.sectionId) ? item.sectionId : fallbackSection?.id || '',
          sectionTitle: input.sections.find((section) => section.id === item.sectionId)?.title
            || fallbackSection?.title
            || 'Documento',
          rationale: item.rationale!.trim(),
          proposedText: item.proposedText!.trim(),
        }))
        .filter((item) => item.sectionId);
    } catch (error) {
      console.warn('[Rider Review] No se pudo leer el diagnóstico de la IA:', error);
    }
  }

  const points = mergeReviewPoints(aiPoints, localReviewPoints(input.sections));
  return {
    score,
    summary,
    points,
    message: composeReviewMessage({ score, summary, points }),
  };
}
