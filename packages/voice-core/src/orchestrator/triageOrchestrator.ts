/**
 * Deterministic triage before LLM assist.
 * One question at a time; never guess when ambiguous.
 */

import {
  canApplyConfirmedChange,
  reduceConfirmation,
  type ConfirmationSnapshot,
  type PendingCartPlan,
} from '../confirmation/ConfirmationStateMachine.js';
import { isStopVoiceAgentMessage } from '../confirmation/confirmUtterances.js';
import { createToolCallId, type VoiceToolCall } from '../tools/contracts.js';
import {
  shouldEscalateForClarificationLoop,
  type OrderingTaskSnapshot,
} from '../session/OrderingTaskFsm.js';

export type TriageDecision =
  | { readonly kind: 'stop_agent' }
  | { readonly kind: 'apply_confirmed_change'; readonly pending: PendingCartPlan }
  | { readonly kind: 'discard_pending' }
  | {
      readonly kind: 'clarify';
      readonly reply: string;
      readonly confirmation: ConfirmationSnapshot;
      readonly task: OrderingTaskSnapshot;
    }
  | {
      readonly kind: 'escalate';
      readonly tool: VoiceToolCall<'escalateToHuman'>;
      readonly reply: string;
    }
  | {
      readonly kind: 'propose_cart_add';
      readonly tool: VoiceToolCall<'addItemToCart'>;
    }
  | {
      readonly kind: 'cart_summary';
      readonly tool: VoiceToolCall<'getCartSummary'>;
    }
  | { readonly kind: 'continue_llm'; readonly confirmation: ConfirmationSnapshot };

const CART_SUMMARY_RE =
  /^(?:what(?:'s|\s+is)?\s+in\s+(?:my\s+)?cart|cart\s+summary|show\s+(?:my\s+)?cart|read\s+(?:my\s+)?cart|items?\s+(?:that\s+)?(?:were\s+|was\s+)?(?:added\s+)?(?:in|to)\s+(?:the\s+|my\s+)?cart|what\s+(?:did|was)\s+(?:i|you)\s+add|pending\s+(?:item|plan|cart)|item\s+that\s+was\s+added)\b/i;

const ADD_RE =
  /^(?:please\s+)?add\s+(\d+|one|won|two|three|tree|four|five|six|seven|eight|nine|ten|a|an)\s+(.+?)(?:\s+from\s+(.+))?$/i;

function parseTriageQuantity(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Math.min(20, Math.max(1, Number(token)));
  const map: Record<string, number> = {
    a: 1,
    an: 1,
    one: 1,
    won: 1,
    two: 2,
    three: 3,
    tree: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  return map[token.toLowerCase()] ?? null;
}

export function triageVoiceUtterance(input: {
  readonly message: string;
  readonly confirmation: ConfirmationSnapshot;
  readonly task: OrderingTaskSnapshot;
}): {
  readonly decision: TriageDecision;
  readonly confirmation: ConfirmationSnapshot;
} {
  const message = input.message.trim();
  let confirmation = input.confirmation;

  if (!message) {
    return {
      decision: { kind: 'continue_llm', confirmation },
      confirmation,
    };
  }

  if (isStopVoiceAgentMessage(message)) {
    confirmation = reduceConfirmation(confirmation, { type: 'USER_UTTERANCE', message });
    return { decision: { kind: 'stop_agent' }, confirmation };
  }

  confirmation = reduceConfirmation(confirmation, { type: 'USER_UTTERANCE', message });

  if (canApplyConfirmedChange(confirmation) && confirmation.pending) {
    return {
      decision: { kind: 'apply_confirmed_change', pending: confirmation.pending },
      confirmation,
    };
  }

  if (confirmation.phase === 'discarded') {
    return {
      decision: { kind: 'discard_pending' },
      confirmation: reduceConfirmation(confirmation, { type: 'CLEAR' }),
    };
  }

  if (
    confirmation.phase === 'awaiting_clarification' &&
    confirmation.pending &&
    /^(?:yes|ok|confirm)/i.test(message)
  ) {
    const reply =
      confirmation.pending.clarificationQuestion ||
      'Tell me the exact dish name from that kitchen’s menu, then say confirm.';
    const task = {
      ...input.task,
      clarificationCount: input.task.clarificationCount + 1,
      state: 'needs_clarification' as const,
    };
    if (shouldEscalateForClarificationLoop(task)) {
      return {
        decision: {
          kind: 'escalate',
          reply: 'I’m having trouble finding that dish. I can connect you to support, or you can browse the menu.',
          tool: {
            tool: 'escalateToHuman',
            callId: createToolCallId(),
            args: { reason: 'clarification_loop', context: { dishHint: message } },
          },
        },
        confirmation,
      };
    }
    return {
      decision: { kind: 'clarify', reply, confirmation, task },
      confirmation,
    };
  }

  if (CART_SUMMARY_RE.test(message)) {
    return {
      decision: {
        kind: 'cart_summary',
        tool: {
          tool: 'getCartSummary',
          callId: createToolCallId(),
          args: {},
        },
      },
      confirmation,
    };
  }

  const addMatch = message.match(ADD_RE);
  if (addMatch) {
    const quantity = parseTriageQuantity(addMatch[1]);
    const itemName = (addMatch[2] || '')
      .replace(/\b(?:quantity|qty)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    const kitchenHint = (addMatch[3] || '').trim() || undefined;
    if (itemName && quantity != null && quantity > 0) {
      return {
        decision: {
          kind: 'propose_cart_add',
          tool: {
            tool: 'addItemToCart',
            callId: createToolCallId(),
            args: {
              itemName,
              quantity,
              ...(kitchenHint ? { kitchenHint } : {}),
            },
          },
        },
        confirmation,
      };
    }
  }

  return {
    decision: { kind: 'continue_llm', confirmation },
    confirmation,
  };
}
