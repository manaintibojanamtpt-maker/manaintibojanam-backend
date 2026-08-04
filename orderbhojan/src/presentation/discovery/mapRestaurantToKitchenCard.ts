import type { MarketplaceKitchenCard, MarketplaceBadge } from '@bhojan/storefront-design-system/marketplace/types';
import type { RestaurantPublic } from '@/types/marketplace';
import type { MockRestaurant } from '@/features/experience/domain/experience.types';
import {
  formatDeliveryFee,
  hasOffer,
  kitchenBadgeLabel,
  kitchenFormatLabel,
  shouldShowKitchenBadge,
} from '@/features/discovery/utils/restaurantDisplay';
import { isDisplayableDistanceKm } from '@/features/discovery/utils/distanceDisplay';

function parseEtaMinutes(eta: string): number | undefined {
  const match = eta.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseDistanceKm(distance: string): number | undefined {
  const match = distance.match(/([\d.]+)/);
  if (!match) return undefined;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildBadges(restaurant: RestaurantPublic): MarketplaceBadge[] {
  const badges: MarketplaceBadge[] = [];

  if (!restaurant.isOpen) {
    badges.push({ id: 'closed', label: 'Closed' });
  }
  if (hasOffer(restaurant)) {
    badges.push({ id: 'offer', label: restaurant.offer?.trim() || 'Offer' });
  }
  if (shouldShowKitchenBadge(restaurant) && kitchenBadgeLabel(restaurant)) {
    badges.push({ id: 'highly_rated', label: kitchenBadgeLabel(restaurant)! });
  }
  if (restaurant.kitchenFormat !== 'restaurant') {
    badges.push({ id: 'kitchen_format', label: kitchenFormatLabel(restaurant.kitchenFormat) });
  }

  return badges;
}

export function mapRestaurantPublicToKitchenCard(restaurant: RestaurantPublic): MarketplaceKitchenCard {
  const etaMins =
    restaurant.etaMinutes != null
      ? Math.round((restaurant.etaMinutes.min + restaurant.etaMinutes.max) / 2)
      : undefined;

  return {
    tenantId: restaurant.restaurantId,
    slug: restaurant.restaurantSlug,
    name: restaurant.displayName,
    distanceKm: isDisplayableDistanceKm(restaurant.distanceKm)
      ? restaurant.distanceKm
      : undefined,
    etaMins,
    rating: restaurant.rating,
    cuisineTags: restaurant.cuisines.slice(0, 2),
    thumbnailUrl: restaurant.coverUrl ?? restaurant.logoUrl,
    isOpen: restaurant.isOpen,
    isServiceable: restaurant.isOpen,
    eligibilityLabel: restaurant.isOpen ? kitchenFormatLabel(restaurant.kitchenFormat) : 'Currently closed',
    deliveryFeeLabel: formatDeliveryFee(restaurant),
    badges: buildBadges(restaurant),
    storePath: `/restaurant/${restaurant.restaurantSlug}/menu`,
  };
}

export function mapMockRestaurantToKitchenCard(restaurant: MockRestaurant): MarketplaceKitchenCard {
  const badges: MarketplaceBadge[] = [];

  if (!restaurant.isOpen) {
    badges.push({ id: 'closed', label: 'Closed' });
  }
  if (restaurant.offer) {
    badges.push({ id: 'offer', label: restaurant.offer });
  }
  if (restaurant.isVeg) {
    badges.push({ id: 'highly_rated', label: 'Veg' });
  }
  if (restaurant.isCloudKitchen) {
    badges.push({ id: 'kitchen_format', label: 'Cloud kitchen' });
  }

  return {
    tenantId: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    distanceKm: (() => {
      const parsed = parseDistanceKm(restaurant.distance);
      return isDisplayableDistanceKm(parsed) ? parsed : undefined;
    })(),
    etaMins: parseEtaMinutes(restaurant.eta),
    rating: restaurant.rating,
    cuisineTags: [restaurant.cuisine],
    thumbnailUrl: restaurant.imageUrl,
    isOpen: restaurant.isOpen,
    isServiceable: restaurant.isOpen,
    eligibilityLabel: restaurant.isOpen ? 'Home kitchen' : 'Currently closed',
    deliveryFeeLabel: restaurant.deliveryFee,
    badges,
    storePath: `/restaurant/${restaurant.slug}/menu`,
  };
}
