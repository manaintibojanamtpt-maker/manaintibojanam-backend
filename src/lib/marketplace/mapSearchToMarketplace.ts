/**
 * M4 PR-7 — SearchResult → marketplace search view models (presentation mapping).
 */

import type { SearchRestaurantHit, SearchResult } from '../../sdk/search/dto/results';
import type {
  MarketplaceSearchHighlight,
  MarketplaceSearchMatchBadge,
  MarketplaceSearchResultCard,
} from './searchTypes';

const eligibilityLabel = (hit: SearchRestaurantHit): string => {
  switch (hit.restaurant.eligibility.status) {
    case 'serviceable':
      return 'Delivers to you';
    case 'out_of_radius':
      return 'Outside delivery radius';
    case 'closed':
      return 'Kitchen closed';
    default:
      return hit.restaurant.eligibility.reason ?? 'Unavailable';
  }
};

const matchBadgeForField = (field: string): MarketplaceSearchMatchBadge => {
  const normalized = field.toLowerCase();

  if (normalized === 'name' || normalized === 'slug') {
    return { id: 'matched_restaurant', label: 'Matched Restaurant' };
  }

  if (normalized.includes('cuisine')) {
    return { id: 'matched_cuisine', label: 'Matched Cuisine' };
  }

  if (
    normalized === 'area' ||
    normalized.includes('locality') ||
    normalized.includes('pincode') ||
    normalized.includes('city') ||
    normalized.includes('district')
  ) {
    return { id: 'matched_area', label: 'Matched Area' };
  }

  if (normalized === 'tag' || normalized.includes('tags')) {
    return { id: 'matched_tag', label: 'Matched Tag' };
  }

  return { id: 'matched', label: 'Matched' };
};

export function deriveSearchMatchBadges(hit: SearchRestaurantHit): MarketplaceSearchMatchBadge[] {
  const seen = new Set<string>();
  const badges: MarketplaceSearchMatchBadge[] = [];

  for (const factor of hit.match.factors) {
    const badge = matchBadgeForField(factor.field);
    if (seen.has(badge.id)) {
      continue;
    }
    seen.add(badge.id);
    badges.push(badge);
  }

  if (badges.length === 0) {
    badges.push({ id: 'matched', label: 'Matched' });
  }

  return badges;
}

const buildCuisineLabel = (result: SearchResult): string | undefined => {
  const tags = result.query.inferredCuisine;
  if (!tags?.length) {
    return undefined;
  }
  return tags.join(' · ');
};

export function mapSearchHitToResultCard(
  hit: SearchRestaurantHit,
  cuisineLabel?: string
): MarketplaceSearchResultCard {
  const highlights: MarketplaceSearchHighlight[] =
    hit.highlights?.map((entry) => ({
      field: entry.field,
      snippet: entry.snippet,
    })) ?? [];

  return {
    tenantId: String(hit.restaurant.tenantId),
    slug: hit.restaurant.slug,
    name: hit.restaurant.name,
    distanceKm: hit.restaurant.distanceKm,
    etaMins: hit.restaurant.eta?.totalMins,
    rating: hit.restaurant.rating,
    cuisineLabel,
    thumbnailUrl: hit.restaurant.thumbnailUrl,
    isOpen: hit.restaurant.isOpen,
    isServiceable: hit.restaurant.eligibility.isServiceable,
    eligibilityLabel: eligibilityLabel(hit),
    matchBadges: deriveSearchMatchBadges(hit),
    highlights,
    storePath: hit.restaurant.slug ? `/k/${hit.restaurant.slug}` : `/k/${hit.restaurant.tenantId}`,
  };
}

export function mapSearchResultToCards(result: SearchResult): MarketplaceSearchResultCard[] {
  const cuisineLabel = buildCuisineLabel(result);
  return result.restaurants.map((hit) => mapSearchHitToResultCard(hit, cuisineLabel));
}
