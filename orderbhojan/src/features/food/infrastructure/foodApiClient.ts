import { getMarketplaceApiClient } from '@/marketplace-api';
import type {
  FoodCategoriesResponse,
  FoodCollectionResponse,
  FoodMenuApiPayload,
  FoodMenuQueryParams,
} from '@/types/marketplace-food';

export class FoodApiClient {
  fetchMenu(params: FoodMenuQueryParams): Promise<FoodMenuApiPayload> {
    return getMarketplaceApiClient().foodMenu(params.slug, {
      lat: params.lat,
      lng: params.lng,
    });
  }

  fetchCategories(slug: string): Promise<FoodCategoriesResponse> {
    return getMarketplaceApiClient().foodCategories(slug);
  }

  fetchRecommended(slug: string): Promise<FoodCollectionResponse> {
    return getMarketplaceApiClient().foodRecommended(slug);
  }

  fetchBestsellers(slug: string): Promise<FoodCollectionResponse> {
    return getMarketplaceApiClient().foodBestsellers(slug);
  }
}

let singleton: FoodApiClient | null = null;

export function getFoodApiClient(): FoodApiClient {
  if (!singleton) singleton = new FoodApiClient();
  return singleton;
}

export function resetFoodApiClientForTests(): void {
  singleton = null;
}
