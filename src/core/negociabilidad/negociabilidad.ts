import type { ContraAnswer, ContraResponse } from '../types/contra-rider.types.ts';
import type {
  EffectiveNegotiability,
  ExceptionDecision,
  Negotiability,
  RequirementNegotiability,
} from '../types/negociabilidad.types.ts';
import type { RiderContentDoc, RiderContentNode, SectionItem } from '../types/rider.types.ts';

export type {
  EffectiveNegotiability,
  ExceptionDecision,
  Negotiability,
  RequirementNegotiability,
} from '../types/negociabilidad.types.ts';

export const NEGOTIABILITY_VALUES: Negotiability[] = ['negociable', 'no_negociable', 'sin_definir'];

export const NEGOTIABILITY_LABEL: Record<Negotiability, string> = {
  negociable: 'Negociable',
  no_negociable: 'No negociable',
  sin_definir: 'Sin definir',
};

export const ALTERNATIVA_NO_NEGOCIABLE_COPY =
  'Este pedido no es negociable. La alternativa se guarda como propuesta de excepción y queda pendiente de una decisión explícita del artista (dueño del rider). No cierra un acuerdo.';

const NOTE_MAX = 500;

export function readNegotiability(value: unknown): Negotiability {
  return value === 'negociable' || value === 'no_negociable' ? value : 'sin_definir';
}

export function readNegotiabilityNote(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, NOTE_MAX) : '';
}

export function readExceptionDecision(value: unknown): ExceptionDecision | null {
  return value === 'pending_approver' || value === 'accepted' || value === 'rejected'
    ? value
    : null;
}

export function negotiabilityLabel(value: unknown): string {
  return NEGOTIABILITY_LABEL[readNegotiability(value)];
}

export function exceptionDecisionForAnswer(
  negotiability: Negotiability,
  response: ContraResponse
): ExceptionDecision | null {
  if (response === 'alternativa' && negotiability === 'no_negociable') return 'pending_approver';
  return null;
}

export function isFinalAgreement(
  answer: Pick<ContraAnswer, 'response' | 'exceptionDecision'>
): boolean {
  if (!answer.response) return false;
  if (answer.response === 'alternativa' && answer.exceptionDecision === 'pending_approver') {
    return false;
  }
  if (answer.response === 'alternativa' && answer.exceptionDecision === 'rejected') {
    return false;
  }
  return true;
}

export function mergeContraAnswer(params: {
  negotiability: Negotiability;
  previous?: Pick<ContraAnswer, 'response' | 'offer' | 'note' | 'exceptionDecision'> | null;
  next: Pick<ContraAnswer, 'response' | 'offer' | 'note'> & { exceptionDecision?: ExceptionDecision | null };
}): ContraAnswer {
  const next: ContraAnswer = {
    response: params.next.response,
    offer: params.next.offer,
    note: params.next.note,
    exceptionDecision: null,
  };

  if (next.response !== 'alternativa') {
    return next;
  }

  if (params.previous?.response === 'alternativa') {
    next.exceptionDecision = params.previous.exceptionDecision ?? null;
    return next;
  }

  next.exceptionDecision = exceptionDecisionForAnswer(params.negotiability, next.response);
  return next;
}

export function extractRequirementNegotiability(
  doc: RiderContentDoc | RiderContentNode | undefined
): RequirementNegotiability[] {
  if (!doc) return [];
  const items: RequirementNegotiability[] = [];
  const visit = (node: RiderContentNode) => {
    if (node.type === 'requirement') {
      items.push({
        label: typeof node.attrs?.label === 'string' && node.attrs.label.trim()
          ? node.attrs.label.trim()
          : 'Requisito',
        negotiability: readNegotiability(node.attrs?.negotiability),
        note: readNegotiabilityNote(node.attrs?.negotiabilityNote),
      });
    }
    for (const child of node.content || []) visit(child);
  };
  visit(doc);
  return items;
}

export function effectiveNegotiability(section: Pick<SectionItem, 'negotiability' | 'negotiabilityNote' | 'contentDoc'>): EffectiveNegotiability {
  const requirements = extractRequirementNegotiability(section.contentDoc);
  const blocked = requirements.find((item) => item.negotiability === 'no_negociable');
  if (blocked) {
    return {
      negotiability: 'no_negociable',
      note: blocked.note || readNegotiabilityNote(section.negotiabilityNote),
    };
  }

  const sectionState = readNegotiability(section.negotiability);
  if (sectionState !== 'sin_definir') {
    return {
      negotiability: sectionState,
      note: readNegotiabilityNote(section.negotiabilityNote),
    };
  }

  const marked = requirements.find((item) => item.negotiability !== 'sin_definir');
  if (marked) {
    return { negotiability: marked.negotiability, note: marked.note };
  }

  return {
    negotiability: 'sin_definir',
    note: readNegotiabilityNote(section.negotiabilityNote),
  };
}
