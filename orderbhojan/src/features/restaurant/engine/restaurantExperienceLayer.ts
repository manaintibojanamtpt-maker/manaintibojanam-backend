import { getRestaurantApiClient } from '../infrastructure/restaurantApiClient';
import type {
  RestaurantExperienceApiPayload,
  RestaurantExperienceQueryParams,
  RestaurantExperienceResponse,
  RestaurantGalleryResponse,
  RestaurantHighlightsResponse,
  RestaurantOffersResponse,
} from '@/types/marketplace-restaurant';

export {
  DEFAULT_DISCOVERY_COORDS as DEFAULT_RESTAURANT_COORDS,
  resolveRestaurantCoords,
} from '@/features/location/resolveDeliveryCoords';

function toPublicResponse(payload: RestaurantExperienceApiPayload): RestaurantExperienceResponse {
  return {
    experience: payload.experience,
    hours: payload.hours,
    serviceability: payload.serviceability,
    policies: payload.policies,
    highlights: payload.highlights,
  };
}

export async function loadRestaurantExperience(
  params: RestaurantExperienceQueryParams,
): Promise<RestaurantExperienceResponse> {
  const payload = await getRestaurantApiClient().fetchExperience(params);
  return enrichWithLoyalty(enrichWithAiSummary(toPublicResponse(payload)));
}

export async function loadRestaurantGallery(
  slug: string,
): Promise<RestaurantGalleryResponse> {
  return getRestaurantApiClient().fetchGallery(slug);
}

export async function loadRestaurantOffers(
  slug: string,
): Promise<RestaurantOffersResponse> {
  return getRestaurantApiClient().fetchOffers(slug);
}

export async function loadRestaurantHighlights(
  slug: string,
): Promise<RestaurantHighlightsResponse> {
  return getRestaurantApiClient().fetchHighlights(slug);
}

/** Future hook: AI-generated restaurant summary. */
export function enrichWithAiSummary(
  response: RestaurantExperienceResponse,
): RestaurantExperienceResponse {
  return response;
}

/** Future hook: loyalty program badges. */
export function enrichWithLoyalty(
  response: RestaurantExperienceResponse,
): RestaurantExperienceResponse {
  return response;
}
