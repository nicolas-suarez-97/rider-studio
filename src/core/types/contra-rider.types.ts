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

export interface ContraRiderRecord {
  status: 'draft' | 'sent';
  version: number;
  sentAt: string | null;
  answers: Record<string, ContraAnswer>;
}
