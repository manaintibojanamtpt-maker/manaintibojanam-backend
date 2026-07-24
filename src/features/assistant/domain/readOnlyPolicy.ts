import type {
  MarketingAssistHint,
  MarketingAssistHintType,
  MarketingAssistResult,
} from '../types';

const ALLOWED_HINT_TYPES = new Set<MarketingAssistHintType>([
  'none',
  'navigate',
  'open_url',
  'suggest_signup',
  'suggest_demo',
  'suggest_contact',
]);

/** Consumer / cart / order actions must never surface as marketing hints. */
const FORBIDDEN_ACTION_TYPES = new Set([
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
  'place_order',
  'apply_coupon',
  'set_address',
  'checkout',
]);

export function isForbiddenMarketingActionType(type: string): boolean {
  return FORBIDDEN_ACTION_TYPES.has(type);
}

export function toMarketingHints(proposedActions: unknown): readonly MarketingAssistHint[] {
  if (!Array.isArray(proposedActions)) {
    return [{ type: 'none' }];
  }

  const hints: MarketingAssistHint[] = [];
  for (const raw of proposedActions) {
    if (!raw || typeof raw !== 'object') continue;
    const action = raw as Record<string, unknown>;
    const type = typeof action.type === 'string' ? action.type : '';
    if (isForbiddenMarketingActionType(type)) continue;
    if (!ALLOWED_HINT_TYPES.has(type as MarketingAssistHintType)) continue;

    const payload =
      action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? (action.payload as Record<string, unknown>)
        : undefined;
    const target =
      (typeof payload?.path === 'string' && payload.path) ||
      (typeof payload?.url === 'string' && payload.url) ||
      (typeof payload?.href === 'string' && payload.href) ||
      (typeof payload?.route === 'string' && payload.route) ||
      undefined;

    hints.push(
      target
        ? { type: type as MarketingAssistHintType, target }
        : { type: type as MarketingAssistHintType },
    );
  }

  return hints.length > 0 ? hints : [{ type: 'none' }];
}

export function assertNoSideEffects(result: MarketingAssistResult): void {
  if (result.sideEffects.length !== 0 || result.mutatedState !== false) {
    throw new Error('Marketing assist contract violated: side effects are not allowed');
  }
}
