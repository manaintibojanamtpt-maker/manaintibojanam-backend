import type { DiscoveryCollectionId } from '@/types/marketplace-discovery';

export interface DiscoveryCollectionDefinition {
  readonly id: DiscoveryCollectionId;
  readonly title: string;
  readonly subtitle?: string;
  readonly backedByApi: boolean;
  readonly homeOrder: number;
}

export const DISCOVERY_COLLECTIONS: readonly DiscoveryCollectionDefinition[] = [
  { id: 'nearby', title: 'Nearby Restaurants', subtitle: 'Closest to you', backedByApi: true, homeOrder: 1 },
  { id: 'featured', title: 'Featured', subtitle: 'Curated for you', backedByApi: false, homeOrder: 2 },
  { id: 'top-rated', title: 'Top Rated', subtitle: 'Loved by foodies', backedByApi: false, homeOrder: 3 },
  { id: 'trending', title: 'Trending Now', backedByApi: false, homeOrder: 4 },
  { id: 'fast-delivery', title: 'Fast Delivery', subtitle: 'Under 30 minutes', backedByApi: false, homeOrder: 5 },
  { id: 'cloud-kitchens', title: 'Cloud Kitchens', subtitle: 'Delivery-only gems', backedByApi: false, homeOrder: 6 },
  { id: 'offers', title: 'Offers & Deals', backedByApi: false, homeOrder: 7 },
  { id: 'recommended', title: 'Recommended for You', backedByApi: false, homeOrder: 8 },
  { id: 'popular-near-you', title: 'Popular Near You', backedByApi: false, homeOrder: 9 },
  { id: 'new-on-orderbhojan', title: 'New on OrderBhojan', backedByApi: false, homeOrder: 10 },
  { id: 'breakfast', title: 'Breakfast', backedByApi: false, homeOrder: 11 },
  { id: 'lunch', title: 'Lunch Picks', backedByApi: false, homeOrder: 12 },
  { id: 'dinner', title: 'Dinner Favourites', backedByApi: false, homeOrder: 13 },
  { id: 'late-night', title: 'Late Night', backedByApi: false, homeOrder: 14 },
  { id: 'festival-specials', title: 'Festival Specials', backedByApi: false, homeOrder: 15 },
  { id: 'healthy-choices', title: 'Healthy Choices', backedByApi: false, homeOrder: 16 },
  { id: 'family-meals', title: 'Family Meals', backedByApi: false, homeOrder: 17 },
  { id: 'beverages', title: 'Beverages & Snacks', backedByApi: false, homeOrder: 18 },
  { id: 'desserts', title: 'Desserts', backedByApi: false, homeOrder: 19 },
  { id: 'recently-added', title: 'Recently Added', backedByApi: false, homeOrder: 20 },
] as const;

export const HOME_COLLECTION_IDS: readonly DiscoveryCollectionId[] = DISCOVERY_COLLECTIONS
  .slice()
  .sort((a, b) => a.homeOrder - b.homeOrder)
  .map((c) => c.id);

export function getCollectionDefinition(id: DiscoveryCollectionId): DiscoveryCollectionDefinition {
  return DISCOVERY_COLLECTIONS.find((c) => c.id === id) ?? DISCOVERY_COLLECTIONS[0];
}
