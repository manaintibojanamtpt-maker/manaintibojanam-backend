import type { CartPlanAction } from './cartPlanContract';
import type { PersonalizationReorderSource } from './personalizationBootstrap.types';

/**
 * Build non-executable cart_add_plan actions from a real reorder payload.
 * Availability / variants are resolved later by cart-plan validate (Phase 15).
 */
export function buildCartAddPlansFromReorder(
  source: PersonalizationReorderSource,
  options?: { readonly reason?: string },
): readonly CartPlanAction[] {
  if (!source.items.length) return [];

  const reason = options?.reason ?? 'personalization_reorder';

  return source.items.map((item) => ({
    type: 'cart_add_plan' as const,
    requiresConfirmation: true as const,
    executable: false as const,
    payload: {
      itemId: item.itemId,
      foodId: item.itemId,
      name: item.name,
      quantity: Math.max(1, Math.floor(item.quantity)),
      unitPrice: item.unitPrice,
      price: item.unitPrice,
      restaurantId: source.restaurantId,
    },
    reason,
  }));
}

export function pickUsualReorderSource(params: {
  readonly bootstrapReorder?: PersonalizationReorderSource;
  readonly activeRestaurantId?: string | null;
}): PersonalizationReorderSource | undefined {
  const reorder = params.bootstrapReorder;
  if (!reorder?.items.length) return undefined;

  const active = params.activeRestaurantId?.trim();
  if (!active) return reorder;
  if (reorder.restaurantId === active) return reorder;
  return undefined;
}
