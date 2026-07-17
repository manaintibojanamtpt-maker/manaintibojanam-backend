import type { RestaurantExperiencePublic } from '@/types/marketplace-restaurant';
import { isDisplayableDistanceKm } from '@/features/discovery/utils/distanceDisplay';

export function formatEtaLabel(eta?: { min: number; max: number }): string {
  if (!eta) return '—';
  return `${eta.min}–${eta.max} min`;
}

export function formatDistanceLabel(km?: number): string {
  if (!isDisplayableDistanceKm(km)) return '—';
  return `${km.toFixed(1)} km`;
}

export function formatDeliveryFeeLabel(
  fee?: number | null,
  options?: { readonly known?: boolean },
): string {
  if (options?.known === false) return '—';
  if (fee == null) return '—';
  if (fee === 0) return 'Free delivery';
  return `₹${fee} delivery`;
}

export function formatOpenStatusLabel(status: RestaurantExperiencePublic['openStatus']): string {
  switch (status) {
    case 'open':
      return 'Open now';
    case 'closing_soon':
      return 'Closing soon';
    case 'closed':
    default:
      return 'Closed';
  }
}

export function cuisineHeadline(cuisines: readonly string[]): string {
  if (cuisines.length === 0) return 'Home-style kitchen';
  return cuisines.slice(0, 3).join(' · ');
}

export function kitchenDietaryLabel(
  profile?: RestaurantExperiencePublic['kitchenDietary'],
): string | null {
  switch (profile) {
    case 'pure_veg':
      return 'Pure Veg';
    case 'non_veg':
      return 'Non-Veg';
    default:
      return null;
  }
}
