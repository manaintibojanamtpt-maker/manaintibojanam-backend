import { getFoodApiClient } from '../infrastructure/foodApiClient';
import { isContractMenuPathEnabled } from '../hooks/useContractV1Feature';
import { mapFoodMenuDTOToFoodMenuResponse } from '@/marketplace-api/mappers/v1/foodMenuV1ToLegacy';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import type {
  FoodCollectionResponse,
  FoodMenuApiPayload,
  FoodMenuQueryParams,
  FoodMenuResponse,
} from '@/types/marketplace-food';
import type { FoodMenuApiEnvelopeDTO } from '@bhojan/marketplace-contracts';

function persistMenuContext(
  slug: string,
  contextToken: string,
  restaurantId: string,
): void {
  useRestaurantContextStore.getState().setContext({
    restaurantSlug: slug,
    contextToken,
    restaurantId,
  });
}

function restaurantIdFromEnvelope(envelope: FoodMenuApiEnvelopeDTO, slug: string): string {
  return envelope.items[0]?.restaurantId ?? slug;
}

export async function loadFoodMenu(params: FoodMenuQueryParams): Promise<FoodMenuResponse> {
  if (isContractMenuPathEnabled()) {
    const envelope = await getFoodApiClient().fetchMenuContractV1(params);
    persistMenuContext(
      params.slug,
      envelope.contextToken,
      restaurantIdFromEnvelope(envelope, params.slug),
    );
    const menu = mapFoodMenuDTOToFoodMenuResponse(envelope);
    return enrichWithRecommendations(enrichWithAiBadges(menu));
  }

  const payload = await getFoodApiClient().fetchMenu(params);
  persistMenuContext(params.slug, payload.contextToken, `obr_${params.slug}`);
  return enrichWithRecommendations(enrichWithAiBadges(stripInternal(payload)));
}

export async function loadFoodRecommended(slug: string): Promise<FoodCollectionResponse> {
  return getFoodApiClient().fetchRecommended(slug);
}

export async function loadFoodBestsellers(slug: string): Promise<FoodCollectionResponse> {
  return getFoodApiClient().fetchBestsellers(slug);
}

function stripInternal(payload: FoodMenuApiPayload): FoodMenuResponse {
  return {
    slug: payload.slug,
    restaurantName: payload.restaurantName,
    categories: payload.categories,
    items: payload.items,
    featuredIds: payload.featuredIds,
    todaysSpecialIds: payload.todaysSpecialIds,
  };
}

/** Future hook: AI food badges and descriptions. */
export function enrichWithAiBadges(menu: FoodMenuResponse): FoodMenuResponse {
  return menu;
}

/** Future hook: personalized ranking / combos. */
export function enrichWithRecommendations(menu: FoodMenuResponse): FoodMenuResponse {
  return menu;
}
