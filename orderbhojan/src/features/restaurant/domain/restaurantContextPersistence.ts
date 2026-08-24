import { useRestaurantContextStore } from '../store/restaurantContextStore';
import type { RestaurantExperienceApiPayload, RestaurantExperienceResponse } from '@/types/marketplace-restaurant';

/**
 * Persists restaurant context from the internal API payload into the store.
 * This helper lives in the domain layer so the experience layer (UI-facing)
 * does not need to reference the internal `contextToken` field.
 */
export function persistRestaurantContextFromApiPayload(
  payload: RestaurantExperienceApiPayload,
  response: RestaurantExperienceResponse
): void {
  // Persist restaurant coordinates for local delivery fee estimation
  // Uses payload.contextToken (from internal API envelope) — not on public response type
  if (
    typeof response.experience.restaurantLat === 'number' &&
    typeof response.experience.restaurantLng === 'number'
  ) {
    useRestaurantContextStore.getState().setContext({
      restaurantId: response.experience.restaurantId,
      restaurantSlug: response.experience.slug,
      contextToken: payload.contextToken,
      restaurantLat: response.experience.restaurantLat,
      restaurantLng: response.experience.restaurantLng,
    });
  }
}