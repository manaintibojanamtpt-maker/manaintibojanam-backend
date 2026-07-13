import { useDiscoveryHome } from '../hooks/useDiscoveryHome';
import { DiscoveryCollectionRail } from './DiscoveryCollectionRail';
import { DiscoveryFiltersBar } from './DiscoveryFiltersBar';
import { TrendingFoodsSection } from '@/features/experience/ui/home/TrendingFoodsSection';
import { useDiscoveryFeatureEnabled } from '../hooks/useDiscoveryFeature';
import { KitchenSpotlightCard } from '@/features/experience/ui/home/KitchenSpotlightCard';
import { buildDiscoverySpotlightFeed } from '@/features/experience/utils/homeSpotlightFeed';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM } from '../domain/discoveryPolicy';
import { useLocationFeatureEnabled, useLocationActions } from '@/features/location';
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
        Show all kitchens
      </SoftButton>
    </div>
  );
}

export function DiscoveryHomeFeed() {
  const query = useDiscoveryHome();
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);
  const locationEnabled = useLocationFeatureEnabled();
  const { openSelector } = useLocationActions();
  const online = useOnlineStatus();

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
    return (
      <div>
        <DiscoveryFiltersBar />
        <DiscoveryActiveFilterBanner />
        <OrderBhojanDiscoveryUxState
          variant="no-restaurants"
          title={`No kitchens within ${CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km`}
          description={
            query.data?.locationLabel
              ? `We could not find published kitchens delivering to ${query.data.locationLabel}. Update your location or clear filters.`
              : 'Update your delivery location or clear filters to see available kitchens.'
          }
          primaryLabel="Show all kitchens"
          onPrimary={() => {
            resetFilters();
            void query.refetch();
          }}
          secondaryLabel={locationEnabled ? 'Update location' : undefined}
          onSecondary={locationEnabled ? () => openSelector() : undefined}
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
            Kitchens within {CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km of {query.data.locationLabel}
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
