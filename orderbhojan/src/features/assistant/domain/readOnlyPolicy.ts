import type { ConsumerAssistHint, ConsumerAssistHintType, ConsumerAssistResult } from '../types';

const ALLOWED_HINT_TYPES = new Set<ConsumerAssistHintType>(['none', 'navigate', 'open_url']);

const MUTATION_ACTION_TYPES = new Set([
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
  'place_order',
]);

/** Client-side defense: never treat mutation action types as hints. */
export function isMutationActionType(type: string): boolean {
  return MUTATION_ACTION_TYPES.has(type);
}

export function toConsumerHints(proposedActions: unknown): readonly ConsumerAssistHint[] {
  if (!Array.isArray(proposedActions)) {
    return [{ type: 'none' }];
  }

  const hints: ConsumerAssistHint[] = [];
  for (const raw of proposedActions) {
    if (!raw || typeof raw !== 'object') continue;
    const action = raw as Record<string, unknown>;
    const type = typeof action.type === 'string' ? action.type : '';
    if (isMutationActionType(type)) continue;
    if (!ALLOWED_HINT_TYPES.has(type as ConsumerAssistHintType)) continue;

    const payload =
      action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? (action.payload as Record<string, unknown>)
        : undefined;
    const target =
      (typeof payload?.path === 'string' && payload.path) ||
      (typeof payload?.url === 'string' && payload.url) ||
      (typeof payload?.href === 'string' && payload.href) ||
      undefined;

    hints.push(target ? { type: type as ConsumerAssistHintType, target } : { type: type as ConsumerAssistHintType });
  }

  return hints.length > 0 ? hints : [{ type: 'none' }];
}

export function assertNoSideEffects(result: ConsumerAssistResult): void {
  if (result.sideEffects.length !== 0 || result.mutatedState !== false) {
    throw new Error('Consumer assist contract violated: side effects are not allowed');
  }
}
