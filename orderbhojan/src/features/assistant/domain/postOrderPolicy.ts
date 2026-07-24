import { isMutationActionType, toConsumerHints } from './readOnlyPolicy';
import type { ConsumerAssistHint } from '../types';
import type { PostOrderAssistResult } from './postOrderAssistContract';

/** My Orders / tracking / profile for human escalation. */
const ALLOWED_POST_ORDER_NAVIGATE =
  /^\/(?:orders(?:\/[A-Za-z0-9_-]+\/track)?|profile)\/?$/;

/** mailto support only — no arbitrary https escalation targets. */
const ALLOWED_POST_ORDER_MAILTO =
  /^mailto:support@orderbhojan\.com(?:\?[^#]*)?$/i;

const FORBIDDEN_HINT_TYPES = new Set([
  'reorder',
  'cancel_order',
  'refund',
  'change_address',
  'place_order',
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
]);

export function isAllowedPostOrderHintTarget(
  type: ConsumerAssistHint['type'],
  target: string | undefined,
): boolean {
  if (!target?.trim()) return false;
  const trimmed = target.trim();

  if (type === 'navigate') {
    const normalized = trimmed.replace(/\/+$/, '') || '/';
    return ALLOWED_POST_ORDER_NAVIGATE.test(normalized);
  }

  if (type === 'open_url') {
    if (ALLOWED_POST_ORDER_MAILTO.test(trimmed)) return true;
    // Legacy allowlist: in-app /orders paths via open_url
    const asPath = trimmed.replace(/\/+$/, '') || '/';
    return ALLOWED_POST_ORDER_NAVIGATE.test(asPath) && asPath.startsWith('/orders');
  }

  return false;
}

/**
 * Post-order hint sanitizer: strip mutations; allow orders/profile/mailto escalation.
 * Informational only — callers must not auto-navigate.
 */
export function toPostOrderHints(proposedActions: unknown): readonly ConsumerAssistHint[] {
  if (!Array.isArray(proposedActions)) {
    return [{ type: 'none' }];
  }

  const base = toConsumerHints(
    proposedActions.filter((raw) => {
      if (!raw || typeof raw !== 'object') return false;
      const type = typeof (raw as { type?: unknown }).type === 'string'
        ? (raw as { type: string }).type
        : '';
      return !FORBIDDEN_HINT_TYPES.has(type) && !isMutationActionType(type);
    }),
  );

  const hints = base.filter((hint) => isAllowedPostOrderHintTarget(hint.type, hint.target));

  return hints.length > 0 ? hints : [{ type: 'none' }];
}

export function assertPostOrderAssistSafe(result: PostOrderAssistResult): void {
  if (result.sideEffects.length !== 0 || result.mutatedState !== false) {
    throw new Error('Post-order assist contract violated: side effects are not allowed');
  }
  if (result.schemaVersion !== '10.0') {
    throw new Error('Post-order assist contract violated: unexpected schemaVersion');
  }
}
