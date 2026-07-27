import type { CartPlanAction, CartPlanValidationResult } from './cartPlanContract';
import { stripObrRestaurantPrefix } from './restaurantIdSlug';

export type CartPlanSummaryLine = {
  readonly kitchen?: string;
  readonly dish: string;
  readonly quantity: number;
  readonly modifiers?: string;
};

/**
 * Always build a human-readable plan summary for the confirm panel / TTS.
 */
export function summarizePendingCartPlan(
  validation: CartPlanValidationResult | null | undefined,
  extras?: {
    readonly kitchenName?: string | null;
    readonly fallbackActions?: readonly CartPlanAction[];
  },
): readonly CartPlanSummaryLine[] {
  const actions = validation?.proposedActions?.length
    ? validation.proposedActions
    : (extras?.fallbackActions ?? []);

  const lines: CartPlanSummaryLine[] = [];
  for (const action of actions) {
    if (action.type !== 'cart_add_plan' && action.type !== 'cart_update_plan') continue;
    const payload = action.payload ?? {};
    const dish =
      (typeof payload.name === 'string' && payload.name.trim()) ||
      (typeof payload.itemName === 'string' && payload.itemName.trim()) ||
      'Menu item';
    const quantity =
      typeof payload.quantity === 'number' && payload.quantity > 0 ? payload.quantity : 1;
    const modifiers =
      (typeof payload.variantLabel === 'string' && payload.variantLabel.trim()) ||
      (typeof payload.notes === 'string' && payload.notes.trim()) ||
      undefined;
    const kitchenFromId =
      typeof payload.restaurantId === 'string' && payload.restaurantId.trim()
        ? stripObrRestaurantPrefix(payload.restaurantId)
        : '';
    const kitchen =
      (typeof payload.restaurantName === 'string' && payload.restaurantName.trim()) ||
      extras?.kitchenName?.trim() ||
      kitchenFromId ||
      undefined;
    lines.push({
      dish,
      quantity,
      ...(kitchen ? { kitchen } : {}),
      ...(modifiers ? { modifiers } : {}),
    });
  }
  return lines;
}

export function formatCartPlanSummarySpeech(lines: readonly CartPlanSummaryLine[]): string {
  if (lines.length === 0) return '';
  return lines
    .map((line) => {
      const base = `${line.quantity}× ${line.dish}`;
      const kitchen = line.kitchen ? ` from ${line.kitchen}` : '';
      const mods = line.modifiers ? ` (${line.modifiers})` : '';
      return `${base}${kitchen}${mods}`;
    })
    .join('; ');
}
