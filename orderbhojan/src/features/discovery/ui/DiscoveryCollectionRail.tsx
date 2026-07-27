import { useCallback, useState } from 'react';
import type { DiscoveryCollection } from '@/types/marketplace-discovery';
import { loadDiscoveryCollection } from '../engine/discoveryEngine';
import { useActiveLocation } from '@/features/location';
import { resolveActiveDeliveryCoords } from '@/features/location/domain/activeDeliveryLocation';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { OrderBhojanKitchenCard } from '@/presentation/discovery/OrderBhojanKitchenCard';
import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

export interface DiscoveryCollectionRailProps {
  readonly collection: DiscoveryCollection;
  readonly compact?: boolean;
  readonly showHeader?: boolean;
}

export function DiscoveryCollectionRail({
  collection,
  compact = false,
  showHeader = true,
}: DiscoveryCollectionRailProps) {
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveActiveDeliveryCoords(activeLocation);

  const [restaurants, setRestaurants] = useState(collection.restaurants);
  const [page, setPage] = useState(collection.pagination?.page ?? 1);
  const [hasMore, setHasMore] = useState(collection.pagination?.hasMore ?? false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !coords) return;
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
    <section className={compact ? 'space-y-3' : 'space-y-4'} aria-label={collection.title}>
      {showHeader ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#fff8f0]">{collection.title}</h2>
            {collection.subtitle ? (
              <p className="mt-0.5 text-xs text-[#c4b5a5]">{collection.subtitle}</p>
            ) : null}
          </div>
          <span className="text-xs font-semibold text-[#c4b5a5]/70">{restaurants.length} kitchens</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {restaurants.map((restaurant, index) => (
          <OrderBhojanKitchenCard
            key={restaurant.restaurantId}
            restaurant={restaurant}
            variant="grid"
            className="w-full"
            imageLoading={index < 2 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="space-y-3 pt-1">
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
    </section>
  );
}
