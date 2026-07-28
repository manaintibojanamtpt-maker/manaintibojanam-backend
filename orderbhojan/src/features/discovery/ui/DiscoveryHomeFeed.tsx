import { useDiscoveryHome } from '../hooks/useDiscoveryHome';
import { usePrefetchDiscoveryKitchens } from '../hooks/usePrefetchDiscoveryKitchens';
import { readDiscoverySessionCache } from '../engine/discoverySessionCache';
import { resolveActiveDeliveryLocation } from '@/features/location/domain/activeDeliveryLocation';
import { obDebugTrustEvent } from '@/lib/obDebug';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DiscoveryCollectionRail } from './DiscoveryCollectionRail';
import { DiscoveryFiltersBar } from './DiscoveryFiltersBar';
import { TrendingFoodsSection } from '@/features/experience/ui/home/TrendingFoodsSection';
import { useDiscoveryFeatureEnabled } from '../hooks/useDiscoveryFeature';
import { OrderBhojanKitchenCard } from '@/presentation/discovery/OrderBhojanKitchenCard';
import { buildDiscoverySpotlightFeed } from '@/features/experience/utils/homeSpotlightFeed';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { hasDiscoveryFilterOverrides } from '../domain/filterState';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM } from '../domain/discoveryPolicy';
import { useActiveLocation, useLocationFeatureEnabled, useLocationActions } from '@/features/location';
import {
  DEFAULT_LOCATION_DISCOVERY_CTA,
  DEFAULT_LOCATION_DISCOVERY_HINT,
  DEFAULT_MARKETPLACE_CITY_LABEL,
} from '@/lib/marketplaceDefaults';
import { OrderBhojanHomeFeedSkeleton } from '@/presentation/discovery';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanDiscoveryUxState,
  useOnlineStatus,
} from '@/presentation/states';
import { PullToRefresh } from '@/presentation/ui/PullToRefresh';

function DiscoveryNearbyHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-[#fff8f0]">Popular Near You</h2>
      <Link to="/search" className="shrink-0 text-xs font-semibold text-[#e85d04] touch-manipulation">
        View all
      </Link>
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
  const deliveryLocation = resolveActiveDeliveryLocation(activeLocation);
  const coords = deliveryLocation?.coordinates ?? null;
  const { openSelector } = useLocationActions();
  const online = useOnlineStatus();
  const filtersActive = hasDiscoveryFilterOverrides(filters);
  const sessionCachedFeed =
    coords != null ? readDiscoverySessionCache(coords.lat, coords.lng, filters) : undefined;
  const feedData = query.data ?? sessionCachedFeed;
  const showInitialSkeleton = deliveryLocation != null && query.isPending && !feedData;
  const needsLocationPrompt = locationEnabled && deliveryLocation == null;

  useEffect(() => {
    const collections = feedData?.collections ?? [];
    const visibleCollections = collections.filter((c) => c.restaurants.length > 0);
    const spotlightPlan = feedData ? buildDiscoverySpotlightFeed(visibleCollections) : null;
    obDebugTrustEvent(
      'discovery',
      'DiscoveryHomeFeed render',
      {
        needsLocationPrompt,
        queryEnabled: query.isFetched || query.isFetching,
        queryStatus: query.status,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        mode: deliveryLocation?.mode ?? null,
        isConfirmed: deliveryLocation?.isConfirmed ?? false,
        shownKitchens: spotlightPlan?.uniqueKitchenCount ?? 0,
        collectionCount: visibleCollections.length,
      },
      {
        locationMode: deliveryLocation?.mode ?? null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        isConfirmed: deliveryLocation?.isConfirmed ?? false,
        shownKitchens: spotlightPlan?.uniqueKitchenCount ?? 0,
      },
    );
  }, [
    coords?.lat,
    coords?.lng,
    deliveryLocation?.isConfirmed,
    deliveryLocation?.mode,
    feedData,
    needsLocationPrompt,
    query.isFetched,
    query.isFetching,
    query.status,
  ]);

  usePrefetchDiscoveryKitchens(feedData);

  if (needsLocationPrompt) {
    return (
      <div className="space-y-4">
        <DiscoveryFeedControls />
        <OrderBhojanDiscoveryUxState
          variant="location-disabled"
          title={DEFAULT_LOCATION_DISCOVERY_CTA}
          description={DEFAULT_LOCATION_DISCOVERY_HINT}
          primaryLabel="Set your location"
          onPrimary={() => openSelector()}
        />
      </div>
    );
  }

  if (showInitialSkeleton) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="opacity-90">
          <DiscoveryFeedControls />
        </div>
        <DiscoveryNearbyHeader />
        <OrderBhojanHomeFeedSkeleton />
      </div>
    );
  }

  if (!online && !feedData) {
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

  if (visibleCollections.length === 0) {
    const locationLabel = feedData?.locationLabel ?? deliveryLocation?.text.shortLabel ?? DEFAULT_MARKETPLACE_CITY_LABEL;
    const openNowBlocking = Boolean(filters.openNowOnly);

    let title = `No kitchens within ${CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km`;
    let description = deliveryLocation
      ? `We could not find published kitchens delivering to ${locationLabel}.`
      : `${DEFAULT_LOCATION_DISCOVERY_HINT}. We could not find kitchens matching your current view.`;
    let primaryLabel = filtersActive ? 'Clear filters' : locationEnabled ? 'Set your location' : undefined;
    let onPrimary = filtersActive
      ? () => {
          resetFilters();
          void query.refetch();
        }
      : locationEnabled
        ? () => openSelector()
        : undefined;

    if (filtersActive) {
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
      : filtersActive && locationEnabled
        ? 'Update location'
        : locationEnabled && deliveryLocation && !filtersActive
          ? 'Update location'
          : undefined;

    const onSecondary = openNowBlocking
      ? () => {
          setFilters({ openNowOnly: false });
          void query.refetch();
        }
      : secondaryLabel === 'Update location'
        ? () => openSelector()
        : undefined;

    return (
      <div className="space-y-4">
        <DiscoveryFeedControls />
        <OrderBhojanDiscoveryUxState
          variant={filtersActive ? 'no-restaurants' : 'no-restaurants'}
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
      <div className="space-y-3">
        <div className="opacity-90">
          <DiscoveryFeedControls />
        </div>
        {query.isFetching && feedData ? (
          <p
            className="text-[11px] text-white/45"
            data-testid="discovery-stale-refresh"
            aria-live="polite"
          >
            Updating kitchens near you…
          </p>
        ) : null}

        {!online ? (
          <OrderBhojanDiscoveryOfflineNotice onRetry={() => void query.refetch()} />
        ) : null}

        <DiscoveryNearbyHeader />

        {spotlightPlan.sparseCopy ? (
          <p className="text-sm text-white/60">{spotlightPlan.sparseCopy}</p>
        ) : null}

        {spotlightPlan.mode === 'single' && spotlightPlan.spotlightRestaurant ? (
          <>
            <div className="divide-y divide-white/[0.06]">
              <OrderBhojanKitchenCard
                restaurant={spotlightPlan.spotlightRestaurant}
                variant="list"
                className="w-full !border-b-0"
                imageLoading="eager"
              />
            </div>
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
