import { getMarketplaceApiClient } from '@/marketplace-api';
import type {
  RestaurantExperienceApiPayload,
  RestaurantExperienceQueryParams,
  RestaurantGalleryResponse,
  RestaurantHighlightsResponse,
  RestaurantOffersResponse,
} from '@/types/marketplace-restaurant';

export class RestaurantApiClient {
  fetchExperience(params: RestaurantExperienceQueryParams): Promise<RestaurantExperienceApiPayload> {
    return getMarketplaceApiClient().restaurantExperience(params.slug, {
      lat: params.lat,
      lng: params.lng,
    });
  }

  fetchGallery(slug: string): Promise<RestaurantGalleryResponse> {
    return getMarketplaceApiClient().restaurantGallery(slug);
  }

  fetchOffers(slug: string): Promise<RestaurantOffersResponse> {
    return getMarketplaceApiClient().restaurantOffers(slug);
  }

  fetchHighlights(slug: string): Promise<RestaurantHighlightsResponse> {
    return getMarketplaceApiClient().restaurantHighlights(slug);
  }
}

let singleton: RestaurantApiClient | null = null;

export function getRestaurantApiClient(): RestaurantApiClient {
  if (!singleton) singleton = new RestaurantApiClient();
  return singleton;
}

export function resetRestaurantApiClientForTests(): void {
  singleton = null;
}
