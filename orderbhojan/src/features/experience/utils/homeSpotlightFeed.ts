import type { DiscoveryCollection } from '@/types/marketplace-discovery';
import type { RestaurantPublic } from '@/types/marketplace';

export type HomeSpotlightMode = 'single' | 'dual' | 'sparse' | 'full';

export const HOME_SPOTLIGHT_SPARSE_COPY =
  'Home kitchens are cooking in your area. More kitchens join OrderBhojan every week.';

const RESTAURANT_RAIL_COLLECTION_IDS = new Set([
  'nearby',
  'top-rated',
  'fast-delivery',
  'featured',
  'recommended',
  'popular-near-you',
  'trending',
  'dinner',
  'lunch',
  'cloud-kitchens',
  'offers',
  'new-on-orderbhojan',
  'recently-added',
  'family-meals',
]);

export function collectUniqueRestaurants(
  collections: readonly DiscoveryCollection[],
): RestaurantPublic[] {
  const seen = new Set<string>();
  const unique: RestaurantPublic[] = [];
  for (const collection of collections) {
    for (const restaurant of collection.restaurants) {
      if (seen.has(restaurant.restaurantId)) continue;
      seen.add(restaurant.restaurantId);
      unique.push(restaurant);
    }
  }
  return unique;
}

export function resolveHomeSpotlightMode(uniqueKitchenCount: number): HomeSpotlightMode {
  if (uniqueKitchenCount <= 1) return 'single';
  if (uniqueKitchenCount === 2) return 'dual';
  if (uniqueKitchenCount <= 4) return 'sparse';
  return 'full';
}


function isRestaurantRail(collection: DiscoveryCollection): boolean {
  return RESTAURANT_RAIL_COLLECTION_IDS.has(collection.id);
}

export interface HomeSpotlightFeedPlan {
  readonly mode: HomeSpotlightMode;
  readonly uniqueKitchenCount: number;
  readonly spotlightRestaurant: RestaurantPublic | null;
  readonly kitchenCollections: readonly DiscoveryCollection[];
  readonly hiddenCollectionIds: readonly string[];
  readonly sparseCopy: string | null;
}

export function buildDiscoverySpotlightFeed(
  collections: readonly DiscoveryCollection[],
): HomeSpotlightFeedPlan {
  const unique = collectUniqueRestaurants(collections);
  const mode = resolveHomeSpotlightMode(unique.length);

  if (mode === 'full') {
    return {
      mode,
      uniqueKitchenCount: unique.length,
      spotlightRestaurant: null,
      kitchenCollections: collections,
      hiddenCollectionIds: [],
      sparseCopy: null,
    };
  }

  if (mode === 'single') {
    const spotlight =
      unique.find((r) => r.isOpen) ?? unique[0] ?? null;
    return {
      mode,
      uniqueKitchenCount: unique.length,
      spotlightRestaurant: spotlight,
      kitchenCollections: [],
      hiddenCollectionIds: collections.map((c) => c.id),
      sparseCopy: HOME_SPOTLIGHT_SPARSE_COPY,
    };
  }

  if (mode === 'dual') {
    const kitchens = unique.slice(0, 2);
    const combined: DiscoveryCollection = {
      id: 'nearby',
      title: 'Kitchens near you',
      subtitle: 'Home kitchens cooking for your area',
      restaurants: kitchens,
      pagination: { page: 1, limit: kitchens.length, hasMore: false, total: kitchens.length },
      backedByApi: false,
    };
    const trending = collections.find((c) => c.id === 'trending');
    return {
      mode,
      uniqueKitchenCount: unique.length,
      spotlightRestaurant: null,
      kitchenCollections: trending ? [combined, trending] : [combined],
      hiddenCollectionIds: collections
        .filter((c) => c.id !== 'trending' && c.id !== 'nearby')
        .map((c) => c.id),
      sparseCopy: null,
    };
  }

  // sparse — 3–4 kitchens: max 2 deduped restaurant rails
  const restaurantRails = collections.filter(isRestaurantRail);
  const usedIds = new Set<string>();
  const picked: DiscoveryCollection[] = [];

  for (const collection of restaurantRails) {
    if (picked.length >= 2) break;
    const deduped = collection.restaurants.filter((r) => !usedIds.has(r.restaurantId));
    if (deduped.length === 0) continue;
    deduped.forEach((r) => usedIds.add(r.restaurantId));
    picked.push({ ...collection, restaurants: deduped, backedByApi: collection.backedByApi });
  }

  const nonRestaurant = collections.filter((c) => !isRestaurantRail(c));
  const hidden = collections
    .filter((c) => !picked.some((p) => p.id === c.id) && !nonRestaurant.some((n) => n.id === c.id))
    .map((c) => c.id);

  return {
    mode,
    uniqueKitchenCount: unique.length,
    spotlightRestaurant: null,
    kitchenCollections: [...picked, ...nonRestaurant],
    hiddenCollectionIds: hidden,
    sparseCopy: null,
  };
}

export function dedupeMockRestaurants<T extends { id: string }>(restaurants: readonly T[]): T[] {
  const seen = new Set<string>();
  return restaurants.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
