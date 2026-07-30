/**
 * Maps OrderBhojan assistant pending state ↔ voice-core confirmation snapshots.
 * Phase 1.1: keep decideVoiceCartTurn as primary confirm/add router;
 * voice-core owns cart_summary (and later fuller confirm/add).
 */
import {
  initialConfirmationSnapshot,
  reduceConfirmation,
  triageVoiceUtterance,
  type ConfirmationSnapshot,
  type OrderingTaskSnapshot,
} from '@bhojan/voice-core';
import type { CartPlanValidationResult } from '@/features/assistant/domain/cartPlanContract';

export function pendingValidationToConfirmation(
  pending: CartPlanValidationResult | null,
  planId = 'pending',
): ConfirmationSnapshot {
  if (!pending) return initialConfirmationSnapshot();
  return reduceConfirmation(initialConfirmationSnapshot(), {
    type: 'SET_PENDING',
    pending: {
      planId,
      status: pending.status,
      valid: pending.valid,
      clarificationQuestion: pending.clarificationQuestions[0],
    },
  });
}

export function idleOrderingTask(
  kitchenId?: string | null,
): OrderingTaskSnapshot {
  return {
    state: 'idle',
    clarificationCount: 0,
    ...(kitchenId ? { kitchenId } : {}),
  };
}

/** True when voice-core should short-circuit before LLM (Phase 1.1: cart summary only). */
export function shouldHandleWithVoiceCorePreLlm(message: string): boolean {
  const { decision } = triageVoiceUtterance({
    message: message.trim(),
    confirmation: initialConfirmationSnapshot(),
    task: idleOrderingTask(),
  });
  return decision.kind === 'cart_summary';
}
