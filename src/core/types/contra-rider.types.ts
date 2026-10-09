import { RiderType } from './rider.types';

export type ContraResponse = '' | 'cubro' | 'alternativa' | 'no_puedo' | 'pregunta';

export interface ContraAnswer {
  response: ContraResponse;
  offer: string;
  note: string;
}

export interface ContraLine extends ContraAnswer {
  id: string;
  module: RiderType;
  moduleLabel: string;
  sectionId: string;
  sectionTitle: string;
  pedido: string;
}

export type FindingVerdict = 'cumple' | 'parcial' | 'no_aparece' | 'contradice';
export type ReviewVerdict = 'cumple' | 'con_observaciones' | 'no_cumple';

export interface ContraFinding {
  lineId: string;
  sectionTitle: string;
  verdict: FindingVerdict;
  riderAsk: string;
  fileOffer: string;
  suggestedResponse: Exclude<ContraResponse, ''>;
  suggestedText: string;
}

export interface ContraReviewRecord {
  verdict: ReviewVerdict;
  summary: string;
  findings: ContraFinding[];
  reviewedAt: string;
}

export interface ContraFileRecord {
  name: string;
  mime: string;
  size: number;
  extractedText: string;
  uploadedAt: string;
}

export interface PromotorFileView {
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
  hasText: boolean;
}

export interface PromotorChatMessage {
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
  roleName?: string;
  roleAvatar?: string;
  review?: ContraReviewRecord | null;
}

export interface ContraRiderRecord {
  status: 'draft' | 'sent';
  version: number;
  sentAt: string | null;
  answers: Record<string, ContraAnswer>;
  file: ContraFileRecord | null;
  review: ContraReviewRecord | null;
  reviewSessionId: string | null;
}
