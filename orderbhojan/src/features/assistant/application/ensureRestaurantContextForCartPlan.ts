import { getMarketplaceApiClient } from '@/marketplace-api';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';

/**
 * Ensure restaurant context + contextToken before applying a confirmed cart plan.
 * Does not mutate the cart — only sets context used by addItem.
 */
export async function ensureRestaurantContextForCartPlan(params: {
  readonly restaurantId: string;
  readonly restaurantSlug: string;
  readonly coords?: { readonly lat: number; readonly lng: number };
}): Promise<void> {
  const restaurantId = params.restaurantId.trim();
  const restaurantSlug = params.restaurantSlug.trim();
  if (!restaurantId || !restaurantSlug) {
    throw new Error('Restaurant context is required to apply a cart plan');
  }

  const current = useRestaurantContextStore.getState();
  if (
    current.restaurantId === restaurantId &&
    current.restaurantSlug === restaurantSlug &&
    current.contextToken
  ) {
    return;
  }

  const coords = params.coords ?? { lat: 0, lng: 0 };
  const experience = await getMarketplaceApiClient().restaurantExperience(restaurantSlug, coords);
  useRestaurantContextStore.getState().setContext({
    restaurantId,
    restaurantSlug,
    contextToken: experience.contextToken,
  });
}
