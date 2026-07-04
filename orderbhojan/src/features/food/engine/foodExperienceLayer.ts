import { getFoodApiClient } from '../infrastructure/foodApiClient';
import type {
  FoodCollectionResponse,
  FoodMenuApiPayload,
  FoodMenuQueryParams,
  FoodMenuResponse,
} from '@/types/marketplace-food';

export async function loadFoodMenu(params: FoodMenuQueryParams): Promise<FoodMenuResponse> {
  const payload = await getFoodApiClient().fetchMenu(params);
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
