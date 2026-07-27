/**
 * Task-oriented voice ordering state machine.
 * Deterministic ordering state wins over free-form LLM chatter.
 */

export type VoiceOrderingTaskState =
  | 'idle'
  | 'capturing_intent'
  | 'resolving_restaurant'
  | 'resolving_menu_item'
  | 'needs_clarification'
  | 'plan_validated'
  | 'awaiting_confirm'
  | 'applying_confirmed_change'
  | 'completed';

export type VoiceOrderingTaskSnapshot = {
  readonly state: VoiceOrderingTaskState;
  readonly kitchenName?: string;
  readonly kitchenId?: string;
  readonly dishName?: string;
  readonly quantity?: number;
  readonly clarificationCount: number;
};

export function deriveTaskStateFromValidation(status: string | undefined | null): VoiceOrderingTaskState {
  if (status === 'validated') return 'awaiting_confirm';
  if (status === 'needs_clarification') return 'needs_clarification';
  if (status === 'invalid') return 'resolving_menu_item';
  return 'idle';
}

/** Explicit cancel / new-order intents that may discard an active cart plan. */
export function isExplicitNewOrderOrCancel(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (/^(cancel|discard|never\s*mind|forget\s*it|start\s*over|new\s*order)\b/i.test(text)) {
    return true;
  }
  // Fresh add intent with dish name — allowed to replace prior pending plan.
  return /^(?:please\s+)?add\b/i.test(text);
}

/**
 * While clarifying or awaiting confirm, keep pending unless user cancels or starts a new add.
 */
export function shouldRetainPendingCartPlan(input: {
  readonly pendingStatus?: string | null;
  readonly userMessage: string;
}): boolean {
  const status = input.pendingStatus;
  if (!status) return false;
  if (!['needs_clarification', 'invalid', 'validated'].includes(status)) return false;
  return !isExplicitNewOrderOrCancel(input.userMessage);
}
