import { Button, Text } from '@bhojan/design-system';
import { useDiscoveryHome } from '../hooks/useDiscoveryHome';
import { DiscoveryCollectionRail } from './DiscoveryCollectionRail';
import { DiscoveryFiltersBar } from './DiscoveryFiltersBar';
import { RestaurantRailSkeleton } from '@/features/experience/ui/shared/ExperienceSkeletons';

export function DiscoveryHomeFeed() {
  const query = useDiscoveryHome();

  if (query.isLoading) {
    return (
      <div className="ob-discovery-feed" aria-busy="true">
        <RestaurantRailSkeleton title="Nearby Restaurants" />
        <RestaurantRailSkeleton title="Featured" />
        <RestaurantRailSkeleton title="Top Rated" />
      </div>
    );
  }

  if (query.isError) {
    return (
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
    );
  }

  const collections = query.data?.collections ?? [];

  if (collections.length === 0) {
    return (
      <section className="ob-section ob-section--full ob-discovery-empty">
        <Text variant="subtitle" as="h2">
          No restaurants found
        </Text>
        <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
          Try adjusting filters or updating your delivery location.
        </Text>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Refresh
        </Button>
      </section>
    );
  }

  return (
    <div className="ob-discovery-feed">
      {query.data?.locationLabel ? (
        <Text variant="caption" className="ob-discovery-feed__location bds-sr-only">
          Showing restaurants near {query.data.locationLabel}
        </Text>
      ) : null}
      <DiscoveryFiltersBar />
      {collections.map((collection) => (
        <DiscoveryCollectionRail key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
