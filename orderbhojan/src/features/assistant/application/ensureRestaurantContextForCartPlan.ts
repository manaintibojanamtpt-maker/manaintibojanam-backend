import { getMarketplaceApiClient } from '@/marketplace-api';
import { MarketplaceApiError } from '@/marketplace-api/errors';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { resolveRestaurantSlugForApi } from '../domain/restaurantIdSlug';

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
  // Never call slug APIs with obr_* marketplace IDs.
  const restaurantSlug = resolveRestaurantSlugForApi({
    restaurantId,
    restaurantSlug: params.restaurantSlug,
  });
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
  try {
    const experience = await getMarketplaceApiClient().restaurantExperience(restaurantSlug, coords);
    useRestaurantContextStore.getState().setContext({
      restaurantId,
      restaurantSlug,
      contextToken: experience.contextToken,
      restaurantLat: experience.experience.restaurantLat ?? null,
      restaurantLng: experience.experience.restaurantLng ?? null,
    });
  } catch (err) {
    if (err instanceof MarketplaceApiError && (err.status === 404 || err.code === 'NOT_FOUND')) {
      throw new Error(
        `I couldn't open that kitchen menu yet. Try naming the kitchen again (e.g. "Inti Bhojanam").`,
      );
    }
    throw err;
  }
}
