import { useDiscoveryHome } from '../hooks/useDiscoveryHome';
import { usePrefetchDiscoveryKitchens } from '../hooks/usePrefetchDiscoveryKitchens';
import { readDiscoverySessionCache } from '../engine/discoverySessionCache';
import { resolveDiscoveryCoords } from '../engine/discoveryEngine';
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
import { OrderBhojanHomeFeedSkeleton } from '@/presentation/discovery';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanDiscoveryUxState,
  useOnlineStatus,
} from '@/presentation/states';
import { PullToRefresh } from '@/presentation/ui/PullToRefresh';

function DiscoveryNearbyHeader({
  kitchenCount,
  locationLabel,
  hasActiveLocation,
}: {
  readonly kitchenCount: number;
  readonly locationLabel?: string;
  readonly hasActiveLocation: boolean;
}) {
  const contextLine = hasActiveLocation
    ? locationLabel
      ? `Within ${CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km of ${locationLabel}`
      : `Within ${CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km`
    : `Showing ${DEFAULT_MARKETPLACE_CITY_LABEL} kitchens until you set your location`;

  return (
    <header className="space-y-1">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Nearby kitchens</h2>
          <p className="text-xs text-white/50">{contextLine}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-[#FF7A00]">
          {kitchenCount} {kitchenCount === 1 ? 'kitchen' : 'kitchens'}
        </span>
      </div>
    </header>
  );
}

function DiscoveryFeedControls() {
  return (
    <div className="space-y-3">
      <DiscoveryFiltersBar />
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
  const coords = resolveDiscoveryCoords(activeLocation);
  const { openSelector } = useLocationActions();
  const online = useOnlineStatus();
  const filtersActive = hasDiscoveryFilterOverrides(filters);
  const sessionCachedFeed = readDiscoverySessionCache(coords.lat, coords.lng, filters);
  const feedData = query.data ?? sessionCachedFeed;
  const showInitialSkeleton = query.isPending && !feedData;

  usePrefetchDiscoveryKitchens(feedData);

  if (showInitialSkeleton) {
    return (
      <div className="space-y-4" aria-busy="true">
        <DiscoveryFeedControls />
        <OrderBhojanHomeFeedSkeleton />
      </div>
    );
  }

  if (!online) {
    return (
      <div className="space-y-4">
        <DiscoveryFeedControls />
        <OrderBhojanDiscoveryOfflineNotice onRetry={() => void query.refetch()} />
        <OrderBhojanDiscoveryUxState
          variant="offline"
          primaryLabel="Retry"
          onPrimary={() => void query.refetch()}
        />
      </div>
    );
  }

  if (query.isError && !feedData) {
    return (
      <div className="space-y-4">
        <DiscoveryFeedControls />
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

  const collections = feedData?.collections ?? [];
  const visibleCollections = collections.filter((c) => c.restaurants.length > 0);
  const spotlightPlan = buildDiscoverySpotlightFeed(visibleCollections);
  const railsToRender = spotlightPlan.kitchenCollections.filter((c) => c.restaurants.length > 0);
  const primaryRail = railsToRender[0] ?? null;
  const secondaryRails = railsToRender.slice(1);
  const totalKitchenCount = spotlightPlan.uniqueKitchenCount;

  if (visibleCollections.length === 0) {
    const usingPuneFallback = !activeLocation;
    const locationLabel = feedData?.locationLabel ?? DEFAULT_MARKETPLACE_CITY_LABEL;
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
      <div className="space-y-4">
        <DiscoveryFeedControls />
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
      disabled={query.isFetching && !feedData}
      onRefresh={async () => {
        await query.refetch();
      }}
    >
      <div className="space-y-5">
        <DiscoveryFeedControls />

        <DiscoveryNearbyHeader
          kitchenCount={totalKitchenCount}
          locationLabel={feedData?.locationLabel}
          hasActiveLocation={Boolean(activeLocation)}
        />

        {spotlightPlan.sparseCopy ? (
          <p className="text-sm text-white/60">{spotlightPlan.sparseCopy}</p>
        ) : null}

        {spotlightPlan.mode === 'single' && spotlightPlan.spotlightRestaurant ? (
          <>
            <KitchenSpotlightCard restaurant={spotlightPlan.spotlightRestaurant} />
            {!discoveryEnabled ? <TrendingFoodsSection /> : null}
          </>
        ) : (
          <>
            {primaryRail ? (
              <DiscoveryCollectionRail
                key={primaryRail.id}
                collection={primaryRail}
                compact
                showHeader={primaryRail.id !== 'nearby'}
              />
            ) : null}

            {secondaryRails.map((collection) => (
              <DiscoveryCollectionRail key={collection.id} collection={collection} compact />
            ))}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
