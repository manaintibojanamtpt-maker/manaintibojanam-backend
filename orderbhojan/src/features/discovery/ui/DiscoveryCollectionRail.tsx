import { useCallback, useState } from 'react';
import type { DiscoveryCollection } from '@/types/marketplace-discovery';
import { loadDiscoveryCollection, resolveDiscoveryCoords } from '../engine/discoveryEngine';
import { useActiveLocation } from '@/features/location';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { OrderBhojanKitchenCard } from '@/presentation/discovery/OrderBhojanKitchenCard';
import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

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
  const [loadError, setLoadError] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setLoadError(false);
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
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, collection, coords, filters]);

  if (restaurants.length === 0) {
    return null;
  }

  return (
    <Section density="comfortable" background="default" className="!py-8">
      <SectionHeader
        title={collection.title}
        description={collection.subtitle}
        align="left"
        className="!mb-6 !text-left"
      />

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible xl:grid-cols-3">
        {restaurants.map((restaurant) => (
          <OrderBhojanKitchenCard
            key={restaurant.restaurantId}
            restaurant={restaurant}
            width="17.5rem"
            className="lg:w-full lg:min-w-0 lg:max-w-full"
          />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-6 space-y-4">
          {loadError ? (
            <OrderBhojanDiscoveryUxState
              variant="load-more-error"
              primaryLabel="Retry"
              onPrimary={() => void loadMore()}
              compact
            />
          ) : null}
          <div className="flex justify-center">
            <SoftButton
              type="button"
              tone="ghost"
              disabled={loading}
              onClick={() => void loadMore()}
              aria-label={`Load more ${collection.title}`}
            >
              {loading ? 'Loading…' : 'Load more'}
            </SoftButton>
          </div>
        </div>
      ) : null}
    </Section>
  );
}
