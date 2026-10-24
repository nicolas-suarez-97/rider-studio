export type Negotiability = 'negociable' | 'no_negociable' | 'sin_definir';

export type ExceptionDecision = 'pending_approver' | 'accepted' | 'rejected';

export interface RequirementNegotiability {
  label: string;
  negotiability: Negotiability;
  note: string;
}

export interface EffectiveNegotiability {
  negotiability: Negotiability;
  note: string;
}
