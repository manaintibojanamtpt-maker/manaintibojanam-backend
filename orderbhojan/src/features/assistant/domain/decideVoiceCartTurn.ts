/**
 * Pure early-route decisions for voice/text cart turns.
 * Deterministic ordering state wins over free-form LLM assist.
 */

import {
  parseCartAddUserMessage,
  parseDishClarificationMessage,
} from './isCartAddUserMessage';
import {
  isConfirmCartUserMessage,
  isDiscardCartUserMessage,
  isValidatedCartConfirmMessage,
} from './isConfirmCartUserMessage';
import {
  formatCartPlanSummarySpeech,
  summarizePendingCartPlan,
} from './summarizePendingCartPlan';
import { shouldRetainPendingCartPlan } from './voiceOrderingTaskState';
import type { CartPlanValidationResult } from './cartPlanContract';

export type VoiceCartTurnDecision =
  | {
      readonly kind: 'confirm_while_clarifying';
      readonly reply: string;
      readonly retainPending: true;
    }
  | { readonly kind: 'apply_validated_confirm'; readonly retainPending: true }
  | { readonly kind: 'discard'; readonly retainPending: false }
  | {
      readonly kind: 'clarify_dish';
      readonly dishName: string;
      readonly quantity: number;
      readonly retainPending: true;
    }
  | {
      readonly kind: 'cart_add_intent';
      readonly quantity: number;
      readonly itemName: string;
      readonly kitchenHint?: string;
      readonly retainPending: false;
    }
  | { readonly kind: 'retain_continue'; readonly retainPending: true }
  | { readonly kind: 'wipe_continue'; readonly retainPending: false };

function quantityFromPending(pending: CartPlanValidationResult | null | undefined): number {
  const q = pending?.proposedActions?.[0]?.payload?.quantity;
  return typeof q === 'number' && q > 0 ? q : 1;
}

/**
 * Decide how `send()` should treat this utterance given pending cart-plan state.
 * Does not perform network I/O or mutate cart.
 */
export function decideVoiceCartTurn(input: {
  readonly message: string;
  readonly pending: CartPlanValidationResult | null | undefined;
  readonly kitchenNameHint?: string | null;
}): VoiceCartTurnDecision {
  const message = input.message.trim();
  const pending = input.pending;

  if (
    pending &&
    (pending.status === 'needs_clarification' || pending.status === 'invalid') &&
    isConfirmCartUserMessage(message)
  ) {
    const clarify =
      pending.clarificationQuestions[0] ||
      pending.issues[0]?.message ||
      'Tell me the exact dish name from that kitchen’s menu, then say confirm.';
    const summary = formatCartPlanSummarySpeech(
      summarizePendingCartPlan(pending, { kitchenName: input.kitchenNameHint }),
    );
    return {
      kind: 'confirm_while_clarifying',
      reply: summary ? `${clarify} (Working on: ${summary})` : clarify,
      retainPending: true,
    };
  }

  if (pending && isValidatedCartConfirmMessage(message, pending)) {
    return { kind: 'apply_validated_confirm', retainPending: true };
  }

  if (pending && isDiscardCartUserMessage(message)) {
    return { kind: 'discard', retainPending: false };
  }

  if (
    pending &&
    (pending.status === 'needs_clarification' || pending.status === 'invalid') &&
    parseDishClarificationMessage(message)
  ) {
    return {
      kind: 'clarify_dish',
      dishName: parseDishClarificationMessage(message)!,
      quantity: quantityFromPending(pending),
      retainPending: true,
    };
  }

  const parsedAdd = parseCartAddUserMessage(message);
  if (parsedAdd) {
    return {
      kind: 'cart_add_intent',
      quantity: parsedAdd.quantity,
      itemName: parsedAdd.itemName,
      ...(parsedAdd.kitchenHint ? { kitchenHint: parsedAdd.kitchenHint } : {}),
      retainPending: false,
    };
  }

  // Bare dish name (search / availability path) → start validate+confirm cart plan.
  if (!pending) {
    const dishOnly = parseDishClarificationMessage(message);
    if (dishOnly && dishOnly.split(/\s+/).length >= 2) {
      return {
        kind: 'cart_add_intent',
        quantity: 1,
        itemName: dishOnly,
        retainPending: false,
      };
    }
  }

  if (
    shouldRetainPendingCartPlan({
      pendingStatus: pending?.status,
      userMessage: message,
    })
  ) {
    return { kind: 'retain_continue', retainPending: true };
  }

  return { kind: 'wipe_continue', retainPending: false };
}

/** Multi-turn helper for integration tests (no React). */
export function simulateVoiceCartTurnSequence(
  turns: readonly string[],
  initialPending: CartPlanValidationResult | null = null,
): {
  readonly decisions: VoiceCartTurnDecision[];
  readonly finalPendingRetained: boolean;
} {
  let pending = initialPending;
  const decisions: VoiceCartTurnDecision[] = [];
  for (const message of turns) {
    const decision = decideVoiceCartTurn({ message, pending });
    decisions.push(decision);
    if (!decision.retainPending) {
      pending = null;
    }
    // Clarify / confirm-while-clarifying keep the same pending object for the test harness.
  }
  return {
    decisions,
    finalPendingRetained: pending != null,
  };
}
