/** Browser quota for the sum of in-flight keepalive request bodies. */
export const KEEPALIVE_BODY_LIMIT = 60_000;

export type PersistLeaveState = {
  dirty: boolean;
  saving: boolean;
  pendingFlush: boolean;
};

export type LeavePersistPlan =
  | { action: 'none' }
  | { action: 'keepalive'; init: RequestInit }
  | { action: 'block' };

export function canShowSaveSuccessToast(confirmedByBackend: boolean): boolean {
  return confirmedByBackend;
}

export function needsLeaveFlush(state: PersistLeaveState): boolean {
  return state.dirty || state.saving || state.pendingFlush;
}

export function persistRequestInit(
  body: string,
  options?: { keepalive?: boolean },
): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: Boolean(options?.keepalive),
  };
}

export function planLeavePersist(state: PersistLeaveState, body: string): LeavePersistPlan {
  if (!needsLeaveFlush(state)) return { action: 'none' };
  if (body.length > KEEPALIVE_BODY_LIMIT) return { action: 'block' };
  // The in-flight save already uses keepalive; a second copy can blow the 64KB quota.
  if (state.saving) return { action: 'none' };
  return { action: 'keepalive', init: persistRequestInit(body, { keepalive: true }) };
}
