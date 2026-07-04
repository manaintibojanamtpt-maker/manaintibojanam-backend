import { useCallback, useState } from 'react';
import { Button, Rail, Text } from '@bhojan/design-system';
import type { DiscoveryCollection } from '@/types/marketplace-discovery';
import { DiscoveryRestaurantCard } from './DiscoveryRestaurantCard';
import { loadDiscoveryCollection, resolveDiscoveryCoords } from '../engine/discoveryEngine';
import { useActiveLocation } from '@/features/location';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';

export interface DiscoveryCollectionRailProps {
  readonly collection: DiscoveryCollection;
}

export function DiscoveryCollectionRail({ collection }: DiscoveryCollectionRailProps) {
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveDiscoveryCoords(activeLocation);

  const [restaurants, setRestaurants] = useState(collection.restaurants);
  const [page, setPage] = useState(collection.pagination?.page ?? 1);
  const [hasMore, setHasMore] = useState(collection.pagination?.hasMore ?? false);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const next = await loadDiscoveryCollection(collection.id, {
        lat: coords.lat,
        lng: coords.lng,
        page: nextPage,
        limit: collection.pagination?.limit ?? 6,
        filters,
      });
      setRestaurants((current) => {
        const seen = new Set(current.map((r) => r.restaurantId));
        const merged = [...current];
        for (const restaurant of next.restaurants) {
          if (!seen.has(restaurant.restaurantId)) merged.push(restaurant);
        }
        return merged;
      });
      setPage(nextPage);
      setHasMore(next.pagination?.hasMore ?? false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, collection, coords, filters]);

  if (restaurants.length === 0) {
    return null;
  }

  return (
    <section
      className="ob-section ob-section--full ob-restaurant-rail ob-discovery-rail"
      aria-label={collection.title}
    >
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">
          {collection.title}
        </Text>
        {collection.subtitle ? (
          <Text variant="caption" className="ob-section__hint">
            {collection.subtitle}
          </Text>
        ) : null}
      </div>
      <Rail>
        {restaurants.map((restaurant) => (
          <DiscoveryRestaurantCard key={restaurant.restaurantId} restaurant={restaurant} />
        ))}
      </Rail>
      {hasMore ? (
        <div className="ob-discovery-rail__actions">
          <Button
            variant="secondary"
            size="compact"
            disabled={loading}
            onClick={() => void loadMore()}
            aria-label={`Load more ${collection.title}`}
          >
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
