import { Button, Text } from '@bhojan/design-system';
import { useNavigate } from 'react-router-dom';
import { useDiscoveryHome } from '../hooks/useDiscoveryHome';
import { DiscoveryCollectionRail } from './DiscoveryCollectionRail';
import { DiscoveryFiltersBar } from './DiscoveryFiltersBar';
import { RestaurantRailSkeleton } from '@/features/experience/ui/shared/ExperienceSkeletons';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM } from '../domain/discoveryPolicy';
import { useLocationFeatureEnabled, LocationSelectorSheet } from '@/features/location';

function DiscoveryActiveFilterBanner() {
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);
  const hasKitchenFilter = Boolean(filters.kitchenFormat);

  if (!hasKitchenFilter) return null;

  return (
    <div className="ob-discovery-filter-banner" role="status">
      <Text variant="bodySm">
        Showing selected kitchen type only.
      </Text>
      <Button variant="ghost" size="compact" onClick={resetFilters}>
        Show all kitchens
      </Button>
    </div>
  );
}

export function DiscoveryHomeFeed() {
  const navigate = useNavigate();
  const query = useDiscoveryHome();
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);
  const locationEnabled = useLocationFeatureEnabled();

  if (query.isLoading) {
    return (
      <div className="ob-discovery-feed" aria-busy="true">
        <DiscoveryFiltersBar />
        <RestaurantRailSkeleton title="Nearby Restaurants" />
        <RestaurantRailSkeleton title="Featured" />
        <RestaurantRailSkeleton title="Top Rated" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="ob-discovery-feed">
        <DiscoveryFiltersBar />
        <section
          className="ob-section ob-section--full ob-discovery-empty"
          role="alert"
          aria-live="polite"
        >
          <Text variant="subtitle" as="h2">
            Could not load restaurants
          </Text>
          <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
            Check your connection and try again.
          </Text>
          <Button variant="primary" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </section>
      </div>
    );
  }

  const collections = query.data?.collections ?? [];
  const visibleCollections = collections.filter((c) => c.restaurants.length > 0);

  if (visibleCollections.length === 0) {
    return (
      <div className="ob-discovery-feed">
        <DiscoveryFiltersBar />
        <DiscoveryActiveFilterBanner />
        <section className="ob-section ob-section--full ob-discovery-empty">
          <Text variant="subtitle" as="h2">
            No kitchens within {CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km
          </Text>
          <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
            {query.data?.locationLabel
              ? `We could not find published kitchens delivering to ${query.data.locationLabel}. Update your location or clear filters.`
              : 'Update your delivery location or clear filters to see available kitchens.'}
          </Text>
          <div className="ob-discovery-empty__actions">
            <Button
              variant="primary"
              onClick={() => {
                resetFilters();
                void query.refetch();
              }}
            >
              Show all kitchens
            </Button>
            {locationEnabled ? (
              <Button variant="secondary" onClick={() => navigate('/?openLocation=1')}>
                Update location
              </Button>
            ) : null}
          </div>
        </section>
        {locationEnabled ? <LocationSelectorSheet /> : null}
      </div>
    );
  }

  return (
    <div className="ob-discovery-feed">
      {query.data?.locationLabel ? (
        <Text variant="caption" className="ob-discovery-feed__location">
          Kitchens within {CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km of {query.data.locationLabel}
        </Text>
      ) : null}
      <DiscoveryFiltersBar />
      <DiscoveryActiveFilterBanner />
      {visibleCollections.map((collection) => (
        <DiscoveryCollectionRail key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
