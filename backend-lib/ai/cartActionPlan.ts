import type { AssistantChannel } from './types.js';
import {
  AI_PROPOSED_ACTION_TYPES,
  normalizeProposedAction,
  type AiProposedAction,
  type AiProposedActionType,
} from './structuredOutput.js';

export const AI_CART_PLAN_SCHEMA_VERSION = '5.0' as const;

export const CART_PLAN_ACTION_TYPES = [
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
] as const;

export type CartPlanActionType = (typeof CART_PLAN_ACTION_TYPES)[number];

export interface CartPlanPayload {
  readonly itemId?: string;
  readonly foodId?: string;
  readonly menuItemId?: string;
  readonly restaurantId?: string;
  readonly name?: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly price?: number;
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly lineId?: string;
  readonly modifiers?: readonly Record<string, unknown>[];
}

export interface NormalizedCartPlan {
  readonly type: CartPlanActionType;
  readonly requiresConfirmation: true;
  readonly executable: false;
  readonly payload: CartPlanPayload;
  readonly reason?: string;
}

export interface CartPlanValidateRequestBody {
  readonly mode?: unknown;
  readonly channel?: unknown;
  readonly restaurantId?: unknown;
  readonly contextToken?: unknown;
  readonly orderType?: unknown;
  readonly proposedActions?: unknown;
  readonly conversationId?: unknown;
}

export interface ParsedCartPlanRequest {
  readonly mode: 'consumer_ordering';
  readonly channel: AssistantChannel;
  readonly restaurantId: string;
  readonly contextToken?: string;
  readonly orderType: 'delivery' | 'pickup';
  readonly proposedActions: readonly AiProposedAction[];
  readonly conversationId?: string;
}

export type CartPlanParseIssueCode =
  | 'MISSING_RESTAURANT'
  | 'EMPTY_ACTIONS'
  | 'INVALID_MODE'
  | 'PLACE_ORDER_REJECTED'
  | 'UNSUPPORTED_ACTION';

export interface CartPlanParseIssue {
  readonly code: CartPlanParseIssueCode;
  readonly message: string;
}

export interface ParseCartPlanRequestResult {
  readonly ok: true;
  readonly value: ParsedCartPlanRequest;
  readonly plans: readonly NormalizedCartPlan[];
  readonly issues: readonly CartPlanParseIssue[];
}

export interface ParseCartPlanRequestFailure {
  readonly ok: false;
  readonly issues: readonly CartPlanParseIssue[];
  readonly clarificationQuestions: readonly string[];
}

export function isCartPlanActionType(value: unknown): value is CartPlanActionType {
  return typeof value === 'string' && (CART_PLAN_ACTION_TYPES as readonly string[]).includes(value);
}

function readPayload(raw: AiProposedAction): CartPlanPayload {
  const payload = raw.payload ?? {};
  const modifiers = Array.isArray(payload.modifiers)
    ? payload.modifiers.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
    : undefined;

  const readString = (key: string): string | undefined => {
    const value = payload[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };

  return {
    ...(readString('itemId') ? { itemId: readString('itemId') } : {}),
    ...(readString('foodId') ? { foodId: readString('foodId') } : {}),
    ...(readString('menuItemId') ? { menuItemId: readString('menuItemId') } : {}),
    ...(readString('restaurantId') ? { restaurantId: readString('restaurantId') } : {}),
    ...(readString('name') ? { name: readString('name') } : {}),
    ...(readString('variantId') ? { variantId: readString('variantId') } : {}),
    ...(readString('variantLabel') ? { variantLabel: readString('variantLabel') } : {}),
    ...(readString('lineId') ? { lineId: readString('lineId') } : {}),
    ...(payload.quantity != null ? { quantity: Math.max(1, Math.floor(Number(payload.quantity))) } : {}),
    ...(payload.unitPrice != null ? { unitPrice: Number(payload.unitPrice) } : {}),
    ...(payload.price != null ? { price: Number(payload.price) } : {}),
    ...(modifiers?.length ? { modifiers } : {}),
  };
}

/**
 * Normalize cart-class proposed actions into Phase 4 plan DTOs.
 * Mutation plans always require confirmation and remain non-executable.
 */
export function normalizeCartPlan(action: AiProposedAction): NormalizedCartPlan | null {
  if (!isCartPlanActionType(action.type)) {
    return null;
  }

  return {
    type: action.type,
    requiresConfirmation: true,
    executable: false,
    payload: readPayload(action),
    ...(action.reason ? { reason: action.reason } : {}),
  };
}

export function parseCartPlansFromProposedActions(
  proposedActions: unknown,
): {
  readonly plans: readonly NormalizedCartPlan[];
  readonly rejectedPlaceOrder: boolean;
  readonly unsupportedActions: readonly string[];
} {
  if (!Array.isArray(proposedActions)) {
    return { plans: [], rejectedPlaceOrder: false, unsupportedActions: [] };
  }

  const plans: NormalizedCartPlan[] = [];
  let rejectedPlaceOrder = false;
  const unsupportedActions: string[] = [];

  for (const raw of proposedActions) {
    const normalized = normalizeProposedAction(raw);
    if (!normalized) continue;

    if (normalized.type === 'place_order') {
      rejectedPlaceOrder = true;
      continue;
    }

    const cartPlan = normalizeCartPlan(normalized);
    if (cartPlan) {
      plans.push(cartPlan);
      continue;
    }

    if (
      normalized.type !== 'none' &&
      normalized.type !== 'navigate' &&
      normalized.type !== 'open_url'
    ) {
      unsupportedActions.push(normalized.type);
    }
  }

  return { plans, rejectedPlaceOrder, unsupportedActions };
}

export function parseCartPlanRequest(
  body: CartPlanValidateRequestBody,
): ParseCartPlanRequestResult | ParseCartPlanRequestFailure {
  const issues: CartPlanParseIssue[] = [];
  const clarificationQuestions: string[] = [];

  if (body.mode !== 'consumer_ordering') {
    issues.push({
      code: 'INVALID_MODE',
      message: 'mode must be consumer_ordering',
    });
    return { ok: false, issues, clarificationQuestions };
  }

  const channel: AssistantChannel =
    body.channel === 'orderbhojan_web' ||
    body.channel === 'orderbhojan_android' ||
    body.channel === 'bhojanos_marketing' ||
    body.channel === 'unknown'
      ? body.channel
      : 'unknown';

  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId.trim() : '';
  if (!restaurantId) {
    issues.push({
      code: 'MISSING_RESTAURANT',
      message: 'restaurantId is required to validate cart plans',
    });
    clarificationQuestions.push('Which restaurant should this cart change apply to?');
  }

  const orderType = body.orderType === 'delivery' || body.orderType === 'pickup' ? body.orderType : 'pickup';
  const contextToken =
    typeof body.contextToken === 'string' && body.contextToken.trim()
      ? body.contextToken.trim()
      : undefined;
  const conversationId =
    typeof body.conversationId === 'string' && body.conversationId.trim()
      ? body.conversationId.trim().slice(0, 128)
      : undefined;

  const { plans, rejectedPlaceOrder, unsupportedActions } = parseCartPlansFromProposedActions(
    body.proposedActions,
  );

  if (rejectedPlaceOrder) {
    issues.push({
      code: 'PLACE_ORDER_REJECTED',
      message: 'place_order is blocked; checkout requires explicit user confirmation in the app',
    });
  }

  for (const actionType of unsupportedActions) {
    if ((AI_PROPOSED_ACTION_TYPES as readonly string[]).includes(actionType)) {
      issues.push({
        code: 'UNSUPPORTED_ACTION',
        message: `Action ${actionType} is not supported on the cart-plan validate path`,
      });
    }
  }

  if (plans.length === 0 && !rejectedPlaceOrder) {
    issues.push({
      code: 'EMPTY_ACTIONS',
      message: 'At least one cart_add_plan, cart_update_plan, or cart_remove_plan is required',
    });
    clarificationQuestions.push('What item would you like to add, update, or remove from your cart?');
  }

  const proposedActions = Array.isArray(body.proposedActions)
    ? body.proposedActions
        .map(normalizeProposedAction)
        .filter((action): action is AiProposedAction => action !== null)
    : [];

  if (issues.some((issue) => issue.code === 'INVALID_MODE')) {
    return { ok: false, issues, clarificationQuestions };
  }

  if (rejectedPlaceOrder && plans.length === 0) {
    return { ok: false, issues, clarificationQuestions };
  }

  if (!restaurantId || plans.length === 0) {
    return { ok: false, issues, clarificationQuestions };
  }

  return {
    ok: true,
    value: {
      mode: 'consumer_ordering',
      channel,
      restaurantId,
      orderType,
      proposedActions,
      ...(contextToken ? { contextToken } : {}),
      ...(conversationId ? { conversationId } : {}),
    },
    plans,
    issues,
  };
}

export function hasItemReference(payload: CartPlanPayload): boolean {
  return Boolean(
    payload.itemId?.trim() ||
      payload.foodId?.trim() ||
      payload.menuItemId?.trim() ||
      payload.name?.trim() ||
      payload.lineId?.trim(),
  );
}

export function hasUnresolvedModifiers(payload: CartPlanPayload): boolean {
  return Array.isArray(payload.modifiers) && payload.modifiers.length > 0;
}

export function isCartMutationActionType(type: AiProposedActionType): boolean {
  return isCartPlanActionType(type) || type === 'place_order';
}
