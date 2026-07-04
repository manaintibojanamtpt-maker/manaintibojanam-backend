import type { RestaurantExperiencePublic } from '@/types/marketplace-restaurant';

export function formatEtaLabel(eta?: { min: number; max: number }): string {
  if (!eta) return '—';
  return `${eta.min}–${eta.max} min`;
}

export function formatDistanceLabel(km?: number): string {
  if (km == null) return '—';
  return `${km.toFixed(1)} km`;
}

export function formatDeliveryFeeLabel(fee?: number | null): string {
  if (fee == null || fee === 0) return 'Free delivery';
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
  return cuisines.slice(0, 3).join(' · ');
}
