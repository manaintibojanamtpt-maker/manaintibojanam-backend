import { useDiscoveryHome } from '../hooks/useDiscoveryHome';
import { DiscoveryCollectionRail } from './DiscoveryCollectionRail';
import { DiscoveryFiltersBar } from './DiscoveryFiltersBar';
import { TrendingFoodsSection } from '@/features/experience/ui/home/TrendingFoodsSection';
import { useDiscoveryFeatureEnabled } from '../hooks/useDiscoveryFeature';
import { KitchenSpotlightCard } from '@/features/experience/ui/home/KitchenSpotlightCard';
import { buildDiscoverySpotlightFeed } from '@/features/experience/utils/homeSpotlightFeed';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { hasDiscoveryFilterOverrides } from '../domain/filterState';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM } from '../domain/discoveryPolicy';
import { useActiveLocation, useLocationFeatureEnabled, useLocationActions } from '@/features/location';
import { DEFAULT_MARKETPLACE_CITY_LABEL } from '@/lib/marketplaceDefaults';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import {
  OrderBhojanHomeFeedSkeleton,
} from '@/presentation/discovery';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanDiscoveryUxState,
  useOnlineStatus,
} from '@/presentation/states';
import { PullToRefresh } from '@/presentation/ui/PullToRefresh';

function DiscoveryActiveFilterBanner() {
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);
  const hasKitchenFilter = Boolean(filters.kitchenFormat);

  if (!hasKitchenFilter) return null;

  return (
    <div
      className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
      role="status"
    >
      <p className="text-sm text-white/70">Showing selected kitchen type only.</p>
      <SoftButton type="button" tone="ghost" size="compact" onClick={resetFilters}>
        Clear filters
      </SoftButton>
    </div>
  );
}

export function DiscoveryHomeFeed() {
  const query = useDiscoveryHome();
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);
  const setFilters = useDiscoveryFilterStore((s) => s.setFilters);
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const { openSelector } = useLocationActions();
  const online = useOnlineStatus();
  const filtersActive = hasDiscoveryFilterOverrides(filters);

  if (query.isLoading) {
    return (
      <div aria-busy="true">
        <DiscoveryFiltersBar />
        <OrderBhojanHomeFeedSkeleton />
      </div>
    );
  }

  if (!online) {
    return (
      <div>
        <DiscoveryFiltersBar />
        <OrderBhojanDiscoveryOfflineNotice onRetry={() => void query.refetch()} />
        <OrderBhojanDiscoveryUxState
          variant="offline"
          primaryLabel="Retry"
          onPrimary={() => void query.refetch()}
        />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div>
        <DiscoveryFiltersBar />
        <OrderBhojanDiscoveryUxState
          variant="error"
          title="Could not load restaurants"
          description="Check your connection and try again."
          primaryLabel="Retry"
          onPrimary={() => void query.refetch()}
        />
      </div>
    );
  }

  const collections = query.data?.collections ?? [];
  const visibleCollections = collections.filter((c) => c.restaurants.length > 0);
  const spotlightPlan = buildDiscoverySpotlightFeed(visibleCollections);
  const railsToRender = spotlightPlan.kitchenCollections.filter((c) => c.restaurants.length > 0);

  if (visibleCollections.length === 0) {
    const usingPuneFallback = !activeLocation;
    const locationLabel = query.data?.locationLabel ?? DEFAULT_MARKETPLACE_CITY_LABEL;
    const openNowBlocking = Boolean(filters.openNowOnly);

    let title = `No kitchens within ${CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km`;
    let description = activeLocation
      ? `We could not find published kitchens delivering to ${locationLabel}.`
      : `Showing ${DEFAULT_MARKETPLACE_CITY_LABEL} kitchens until you set your location. We could not find kitchens matching your current view.`;
    let primaryLabel = filtersActive ? 'Clear filters' : locationEnabled ? 'Set your location' : undefined;
    let onPrimary = filtersActive
      ? () => {
          resetFilters();
          void query.refetch();
        }
      : locationEnabled
        ? () => openSelector()
        : undefined;

    if (usingPuneFallback && locationEnabled) {
      title = 'Set your delivery location';
      primaryLabel = 'Set your location';
      onPrimary = () => openSelector();
    } else if (filtersActive && !usingPuneFallback) {
      title = 'No kitchens match your filters';
      description = `Try clearing filters or updating your location near ${locationLabel}.`;
      primaryLabel = 'Clear filters';
      onPrimary = () => {
        resetFilters();
        void query.refetch();
      };
    }

    const secondaryLabel = openNowBlocking
      ? 'Include closed kitchens'
      : usingPuneFallback && filtersActive && locationEnabled
        ? 'Clear filters'
        : locationEnabled && activeLocation && !filtersActive
          ? 'Update location'
          : filtersActive && locationEnabled && !usingPuneFallback
            ? 'Update location'
            : undefined;

    const onSecondary = openNowBlocking
      ? () => {
          setFilters({ openNowOnly: false });
          void query.refetch();
        }
      : secondaryLabel === 'Clear filters'
        ? () => {
            resetFilters();
            void query.refetch();
          }
        : secondaryLabel === 'Update location'
          ? () => openSelector()
          : undefined;

    return (
      <div>
        <DiscoveryFiltersBar />
        <DiscoveryActiveFilterBanner />
        <OrderBhojanDiscoveryUxState
          variant={usingPuneFallback && locationEnabled ? 'location-disabled' : 'no-restaurants'}
          title={title}
          description={description}
          primaryLabel={primaryLabel}
          onPrimary={onPrimary}
          secondaryLabel={secondaryLabel}
          onSecondary={onSecondary}
        />
      </div>
    );
  }

  return (
    <PullToRefresh
      disabled={query.isFetching}
      onRefresh={async () => {
        await query.refetch();
      }}
    >
      <div className="space-y-6">
        {query.data?.locationLabel ? (
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            {activeLocation
              ? `Kitchens within ${CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km of ${query.data.locationLabel}`
              : `Showing ${DEFAULT_MARKETPLACE_CITY_LABEL} kitchens until you set your location`}
          </p>
        ) : null}
        <DiscoveryFiltersBar />
        <DiscoveryActiveFilterBanner />
        {spotlightPlan.sparseCopy ? (
          <p className="text-sm text-white/60">{spotlightPlan.sparseCopy}</p>
        ) : null}
        {spotlightPlan.mode === 'single' && spotlightPlan.spotlightRestaurant ? (
          <>
            <KitchenSpotlightCard restaurant={spotlightPlan.spotlightRestaurant} />
            {!discoveryEnabled ? <TrendingFoodsSection /> : null}
          </>
        ) : (
          railsToRender.map((collection) => (
            <DiscoveryCollectionRail key={collection.id} collection={collection} />
          ))
        )}
      </div>
    </PullToRefresh>
  );
}
