"use client";

import { createContext, useContext } from 'react';
import type { TransportContraState } from '@/lib/promotor/transport-contra';

export type TransportTmDecisionFn = (
  cardId: string,
  decision: 'aprobada' | 'rechazada' | 'requiere_ajustes' | 'reabrir',
) => void;

export type TransportReviewsContextValue = {
  reviews: Record<string, TransportContraState>;
  onTmDecision?: TransportTmDecisionFn;
};

export const TransportReviewsContext = createContext<TransportReviewsContextValue>({
  reviews: {},
});

export function useTransportReviews(): TransportReviewsContextValue {
  return useContext(TransportReviewsContext);
}
