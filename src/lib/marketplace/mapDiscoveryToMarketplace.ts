/**
 * M3 PR-8 — DiscoveryResult → marketplace view models (presentation mapping).
 */

import type { DiscoveryResult } from '../../sdk/discovery/dto';
import type { NearbyRestaurant } from '../../sdk/discovery/dto/candidates';
import type { MarketplaceBadge, MarketplaceKitchenCard } from './types';

const eligibilityLabel = (restaurant: NearbyRestaurant): string => {
  switch (restaurant.eligibility.status) {
    case 'serviceable':
      return 'Delivers to you';
    case 'out_of_radius':
      return 'Outside delivery radius';
    case 'closed':
      return 'Kitchen closed';
    default:
      return restaurant.eligibility.reason ?? 'Unavailable';
  }
};

export function deriveKitchenBadges(
  restaurant: NearbyRestaurant,
  index: number
): MarketplaceBadge[] {
  const badges: MarketplaceBadge[] = [];

  if (index === 0) {
    badges.push({ id: 'closest', label: 'Closest' });
  }

  if (restaurant.dietaryPreference === 'pure_veg') {
    badges.push({ id: 'pure_veg', label: 'Pure Veg' });
  } else if (restaurant.dietaryPreference === 'non_veg') {
    badges.push({ id: 'non_veg', label: 'Non-Veg' });
  }

  if (restaurant.eligibility.isServiceable) {
    badges.push({ id: 'within_delivery_radius', label: 'Within Delivery Radius' });
  }

  const etaMins = restaurant.eta?.totalMins;
  if (etaMins !== undefined && etaMins <= 35) {
    badges.push({ id: 'fast_delivery', label: 'Fast Delivery' });
  }

  const ratingSignal = restaurant.ranking?.factors.find((factor) => factor.factor === 'rating');
  if ((restaurant.rating ?? 0) >= 4.5 || (ratingSignal?.signal ?? 0) >= 0.8) {
    badges.push({ id: 'highly_rated', label: 'Highly Rated' });
  }

  return badges;
}

export function mapRestaurantToKitchenCard(
  restaurant: NearbyRestaurant,
  index: number
): MarketplaceKitchenCard {
  return {
    tenantId: restaurant.tenantId,
    slug: restaurant.slug,
    name: restaurant.name,
    distanceKm: restaurant.distanceKm,
    etaMins: restaurant.eta?.totalMins,
    rating: restaurant.rating,
    cuisineTags: undefined,
    thumbnailUrl: restaurant.thumbnailUrl,
    isOpen: restaurant.isOpen,
    isServiceable: restaurant.eligibility.isServiceable,
    eligibilityLabel: eligibilityLabel(restaurant),
    badges: deriveKitchenBadges(restaurant, index),
    storePath: `/k/${restaurant.slug}`,
  };
}

export function mapDiscoveryResultToKitchens(
  result: DiscoveryResult
): MarketplaceKitchenCard[] {
  return result.restaurants.map((restaurant, index) =>
    mapRestaurantToKitchenCard(restaurant, index)
  );
}
