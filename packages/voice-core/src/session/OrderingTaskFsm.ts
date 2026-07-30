/**
 * Task-oriented ordering FSM — deterministic state wins over free-form LLM chatter.
 */

export type OrderingTaskState =
  | 'idle'
  | 'capturing_intent'
  | 'resolving_restaurant'
  | 'resolving_menu_item'
  | 'needs_clarification'
  | 'plan_validated'
  | 'awaiting_confirm'
  | 'applying_confirmed_change'
  | 'completed'
  | 'escalated';

export type OrderingTaskSnapshot = {
  readonly state: OrderingTaskState;
  readonly kitchenName?: string;
  readonly kitchenId?: string;
  readonly dishName?: string;
  readonly quantity?: number;
  readonly clarificationCount: number;
  readonly pendingPlanId?: string;
};

export function deriveTaskStateFromValidation(status: string | undefined | null): OrderingTaskState {
  if (status === 'validated') return 'awaiting_confirm';
  if (status === 'needs_clarification') return 'needs_clarification';
  if (status === 'invalid') return 'resolving_menu_item';
  return 'idle';
}

export function isExplicitNewOrderOrCancel(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (/^(cancel|discard|never\s*mind|forget\s*it|start\s*over|new\s*order)\b/i.test(text)) {
    return true;
  }
  return /^(?:please\s+)?add\b/i.test(text);
}

export function shouldRetainPendingCartPlan(input: {
  readonly pendingStatus?: string | null;
  readonly userMessage: string;
}): boolean {
  const status = input.pendingStatus;
  if (!status) return false;
  if (!['needs_clarification', 'invalid', 'validated'].includes(status)) return false;
  return !isExplicitNewOrderOrCancel(input.userMessage);
}

export function bumpClarification(snapshot: OrderingTaskSnapshot): OrderingTaskSnapshot {
  return {
    ...snapshot,
    state: 'needs_clarification',
    clarificationCount: snapshot.clarificationCount + 1,
  };
}

/** After N clarifications, escalate instead of looping forever. */
export const MAX_VOICE_CLARIFICATIONS = 3;

export function shouldEscalateForClarificationLoop(snapshot: OrderingTaskSnapshot): boolean {
  return snapshot.clarificationCount >= MAX_VOICE_CLARIFICATIONS;
}
