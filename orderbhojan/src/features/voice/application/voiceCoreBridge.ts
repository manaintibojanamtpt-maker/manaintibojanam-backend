/**
 * Maps OrderBhojan assistant pending state ↔ voice-core confirmation snapshots.
 * Phase 1.1/1.2: decideVoiceCartTurn remains primary confirm/add router;
 * voice-core owns cart_summary + stop_agent pre-LLM gates.
 */
import {
  initialConfirmationSnapshot,
  reduceConfirmation,
  triageVoiceUtterance,
  type ConfirmationSnapshot,
  type OrderingTaskSnapshot,
} from '@bhojan/voice-core';
import type { CartPlanValidationResult } from '@/features/assistant/domain/cartPlanContract';
import {
  formatCartPlanSummarySpeech,
  summarizePendingCartPlan,
} from '@/features/assistant/domain/summarizePendingCartPlan';

export function pendingValidationToConfirmation(
  pending: CartPlanValidationResult | null,
  planId = 'pending',
): ConfirmationSnapshot {
  if (!pending) return initialConfirmationSnapshot();
  const summarySpeech = formatCartPlanSummarySpeech(summarizePendingCartPlan(pending));
  return reduceConfirmation(initialConfirmationSnapshot(), {
    type: 'SET_PENDING',
    pending: {
      planId,
      status: pending.status,
      valid: pending.valid,
      clarificationQuestion: pending.clarificationQuestions[0],
      ...(summarySpeech ? { summarySpeech } : {}),
    },
  });
}

/** Stable plan id shared by confirmation snapshot + adapter hydrate (must match for apply). */
export function pendingPlanIdFromValidation(
  pending: CartPlanValidationResult | null | undefined,
): string {
  const id = pending?.conversationId?.trim();
  return id && id.length > 0 ? id : 'pending';
}

export function syncConfirmationFromPending(
  pending: CartPlanValidationResult | null,
): ConfirmationSnapshot {
  return pendingValidationToConfirmation(pending, pendingPlanIdFromValidation(pending));
}

export function clearVoiceConfirmation(): ConfirmationSnapshot {
  return initialConfirmationSnapshot();
}

export function foldVoiceConfirmationUtterance(
  snapshot: ConfirmationSnapshot,
  message: string,
): ConfirmationSnapshot {
  return reduceConfirmation(snapshot, { type: 'USER_UTTERANCE', message });
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

/** True when voice-core should short-circuit before LLM (Phase 1.2: cart summary + stop). */
export function shouldHandleWithVoiceCorePreLlm(message: string): boolean {
  const { decision } = triageVoiceUtterance({
    message: message.trim(),
    confirmation: initialConfirmationSnapshot(),
    task: idleOrderingTask(),
  });
  return decision.kind === 'cart_summary' || decision.kind === 'stop_agent';
}
