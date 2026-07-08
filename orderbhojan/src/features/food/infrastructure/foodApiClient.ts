import { getMarketplaceApiClient } from '@/marketplace-api';
import type { FoodMenuApiEnvelopeDTO } from '@bhojan/marketplace-contracts';
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

  fetchMenuContractV1(params: FoodMenuQueryParams): Promise<FoodMenuApiEnvelopeDTO> {
    return getMarketplaceApiClient().foodMenuContractV1(params.slug, {
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
