import type { CartPlanAction, CartPlanValidationResult } from '@/features/assistant/domain/cartPlanContract';
import type { CartLineInput } from '../store/cartStore';

export interface ApplyConfirmedCartPlanDeps {
  readonly addItem: (line: CartLineInput, quantity?: number) => void;
  readonly setQuantity: (lineId: string, quantity: number) => void;
}

export interface ApplyConfirmedCartPlanResult {
  readonly appliedCount: number;
  readonly skipped: readonly { readonly reason: string; readonly action: CartPlanAction }[];
  /** True only when at least one cart mutation ran after explicit confirm. */
  readonly mutatedState: boolean;
}

function payloadString(payload: Readonly<Record<string, unknown>> | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function payloadNumber(payload: Readonly<Record<string, unknown>> | undefined, key: string): number | undefined {
  const value = payload?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

type LineWithQty = { readonly line: CartLineInput; readonly quantity: number };

function parseAdd(action: CartPlanAction): LineWithQty | { error: string } {
  const payload = action.payload;
  const foodId =
    payloadString(payload, 'foodId') ||
    payloadString(payload, 'itemId') ||
    payloadString(payload, 'menuItemId');
  const name = payloadString(payload, 'name') || payloadString(payload, 'title');
  const price = payloadNumber(payload, 'price') ?? payloadNumber(payload, 'unitPrice');
  const quantity = Math.max(1, Math.round(payloadNumber(payload, 'quantity') ?? 1));

  if (!foodId) return { error: 'Missing foodId/itemId' };
  if (!name) return { error: 'Missing item name' };
  if (price === undefined || price < 0) return { error: 'Missing or invalid price' };

  return {
    line: {
      foodId,
      name,
      price,
      ...(payloadString(payload, 'variantId')
        ? { variantId: payloadString(payload, 'variantId')! }
        : {}),
      ...(payloadString(payload, 'variantLabel')
        ? { variantLabel: payloadString(payload, 'variantLabel')! }
        : {}),
      ...(payloadString(payload, 'instructions')
        ? { instructions: payloadString(payload, 'instructions')! }
        : {}),
    },
    quantity,
  };
}

/**
 * Apply a *validated* cart plan only after explicit user confirmation.
 * Callers must pass `userConfirmed: true`. Never invoke from assist/validate resolve paths.
 */
export function applyConfirmedCartPlan(params: {
  readonly userConfirmed: true;
  readonly validation: CartPlanValidationResult;
  readonly deps: ApplyConfirmedCartPlanDeps;
}): ApplyConfirmedCartPlanResult {
  if (params.userConfirmed !== true) {
    throw new Error('Cart plan apply requires explicit userConfirmed: true');
  }
  if (params.validation.status !== 'validated' || !params.validation.valid) {
    return {
      appliedCount: 0,
      skipped: params.validation.proposedActions.map((action) => ({
        reason: 'Plan is not validated',
        action,
      })),
      mutatedState: false,
    };
  }

  const skipped: { reason: string; action: CartPlanAction }[] = [];
  let appliedCount = 0;

  for (const action of params.validation.proposedActions) {
    if (action.type === 'cart_add_plan') {
      const parsed = parseAdd(action);
      if ('error' in parsed) {
        skipped.push({ reason: parsed.error, action });
        continue;
      }
      params.deps.addItem(parsed.line, parsed.quantity);
      appliedCount += 1;
      continue;
    }

    if (action.type === 'cart_update_plan') {
      const lineId =
        payloadString(action.payload, 'lineId') ||
        payloadString(action.payload, 'foodId') ||
        payloadString(action.payload, 'itemId');
      const quantity = payloadNumber(action.payload, 'quantity');
      if (!lineId || quantity === undefined) {
        skipped.push({ reason: 'Update requires lineId/foodId and quantity', action });
        continue;
      }
      params.deps.setQuantity(lineId, Math.max(0, Math.round(quantity)));
      appliedCount += 1;
      continue;
    }

    if (action.type === 'cart_remove_plan') {
      const lineId =
        payloadString(action.payload, 'lineId') ||
        payloadString(action.payload, 'foodId') ||
        payloadString(action.payload, 'itemId');
      if (!lineId) {
        skipped.push({ reason: 'Remove requires lineId/foodId', action });
        continue;
      }
      params.deps.setQuantity(lineId, 0);
      appliedCount += 1;
      continue;
    }

    skipped.push({ reason: `Unsupported action ${action.type}`, action });
  }

  return {
    appliedCount,
    skipped,
    mutatedState: appliedCount > 0,
  };
}
