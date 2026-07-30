/**
 * Explicit confirmation ladder for cart mutations.
 * Never apply cart changes until status === 'validated' and user confirms.
 */

import {
  isConfirmCartUserMessage,
  isDiscardCartUserMessage,
  isStopVoiceAgentMessage,
  isValidatedCartConfirmMessage,
} from './confirmUtterances.js';

export type PendingPlanStatus = 'needs_clarification' | 'invalid' | 'validated' | string;

export type PendingCartPlan = {
  readonly planId: string;
  readonly status: PendingPlanStatus;
  readonly valid?: boolean;
  readonly summarySpeech?: string;
  readonly clarificationQuestion?: string;
};

export type ConfirmationPhase =
  | 'none'
  | 'awaiting_clarification'
  | 'awaiting_confirm'
  | 'ready_to_apply'
  | 'discarded'
  | 'stopped';

export type ConfirmationSnapshot = {
  readonly phase: ConfirmationPhase;
  readonly pending: PendingCartPlan | null;
};

export type ConfirmationEvent =
  | { readonly type: 'SET_PENDING'; readonly pending: PendingCartPlan }
  | { readonly type: 'USER_UTTERANCE'; readonly message: string }
  | { readonly type: 'CLEAR' };

export function initialConfirmationSnapshot(): ConfirmationSnapshot {
  return { phase: 'none', pending: null };
}

export function reduceConfirmation(
  state: ConfirmationSnapshot,
  event: ConfirmationEvent,
): ConfirmationSnapshot {
  if (event.type === 'CLEAR') {
    return initialConfirmationSnapshot();
  }

  if (event.type === 'SET_PENDING') {
    const pending = event.pending;
    if (pending.status === 'validated' && pending.valid === true) {
      return { phase: 'awaiting_confirm', pending };
    }
    if (pending.status === 'needs_clarification' || pending.status === 'invalid') {
      return { phase: 'awaiting_clarification', pending };
    }
    return { phase: 'none', pending };
  }

  const message = event.message.trim();
  if (!message) return state;

  if (isStopVoiceAgentMessage(message)) {
    return { phase: 'stopped', pending: state.pending };
  }

  if (!state.pending) {
    return state;
  }

  if (isDiscardCartUserMessage(message)) {
    return { phase: 'discarded', pending: null };
  }

  if (isValidatedCartConfirmMessage(message, state.pending)) {
    return { phase: 'ready_to_apply', pending: state.pending };
  }

  if (state.phase === 'awaiting_clarification' && isConfirmCartUserMessage(message)) {
    // Bare confirm while clarifying must not apply.
    return state;
  }

  return state;
}

/** True only when cart mutation is allowed. */
export function canApplyConfirmedChange(state: ConfirmationSnapshot): boolean {
  return (
    state.phase === 'ready_to_apply' &&
    state.pending?.status === 'validated' &&
    state.pending.valid === true
  );
}
