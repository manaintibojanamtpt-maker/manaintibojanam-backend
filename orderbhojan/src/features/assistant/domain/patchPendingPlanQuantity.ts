import type { CartPlanAction, CartPlanValidationResult } from './cartPlanContract';

/** Patch quantity on every cart_add/update plan in a pending validation result. */
export function patchPendingPlanQuantity(
  validation: CartPlanValidationResult,
  quantity: number,
): CartPlanValidationResult {
  const qty = Math.min(20, Math.max(1, Math.round(quantity)));
  const proposedActions: CartPlanAction[] = validation.proposedActions.map((action) => {
    if (action.type !== 'cart_add_plan' && action.type !== 'cart_update_plan') return action;
    return {
      ...action,
      payload: {
        ...(action.payload ?? {}),
        quantity: qty,
      },
    };
  });
  return {
    ...validation,
    proposedActions,
  };
}
