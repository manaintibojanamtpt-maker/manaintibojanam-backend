import { Button, Chip, Text } from '@bhojan/design-system';
import type { DiscoverySort } from '@/types/marketplace-discovery';
import type { KitchenFormat } from '@/types/marketplace';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM } from '../domain/discoveryPolicy';

const SORT_OPTIONS: { id: DiscoverySort; label: string }[] = [
  { id: 'distance', label: 'Nearest' },
  { id: 'popularity', label: 'Popular' },
  { id: 'eta', label: 'Fastest' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
];

const KITCHEN_FORMAT_OPTIONS: { id: KitchenFormat; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'cloud_kitchen', label: 'Cloud kitchen' },
  { id: 'chef_kitchen', label: 'Chef kitchen' },
  { id: 'home_kitchen', label: 'Home kitchen' },
];

export function DiscoveryFiltersBar() {
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const setFilters = useDiscoveryFilterStore((s) => s.setFilters);
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);

  const activeCount = [
    filters.vegOnly,
    filters.kitchenFormat,
    filters.offersOnly,
    filters.openNowOnly,
    filters.minRating != null,
    filters.maxDistanceKm != null && filters.maxDistanceKm < CONSUMER_MAX_DISCOVERY_DISTANCE_KM,
  ].filter(Boolean).length;

  return (
    <section
      className="ob-section ob-section--full ob-discovery-filters"
      aria-label="Restaurant filters"
    >
      <div className="ob-discovery-filters__row">
        <Text variant="caption" className="ob-discovery-filters__label">
          Within {CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km
          {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? '' : 's'}` : ''}
        </Text>
        {activeCount > 0 ? (
          <Button variant="ghost" size="compact" onClick={resetFilters}>
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="ob-discovery-filters__chips" role="group" aria-label="Kitchen type">
        <Text variant="caption" className="ob-discovery-filters__sort-label">
          Kitchen
        </Text>
        {KITCHEN_FORMAT_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            selected={filters.kitchenFormat === option.id}
            onClick={() =>
              setFilters({
                kitchenFormat: filters.kitchenFormat === option.id ? undefined : option.id,
                cloudKitchenOnly: false,
              })
            }
          >
            {option.label}
          </Chip>
        ))}
      </div>

      <div className="ob-discovery-filters__chips" role="group" aria-label="Quick filters">
        <Chip
          selected={Boolean(filters.openNowOnly)}
          onClick={() => setFilters({ openNowOnly: !filters.openNowOnly })}
        >
          Open now
        </Chip>
        <Chip
          selected={Boolean(filters.vegOnly)}
          onClick={() => setFilters({ vegOnly: !filters.vegOnly })}
        >
          Veg
        </Chip>
        <Chip
          selected={Boolean(filters.offersOnly)}
          onClick={() => setFilters({ offersOnly: !filters.offersOnly })}
        >
          Offers
        </Chip>
        <Chip
          selected={filters.minRating === 4.5}
          onClick={() =>
            setFilters({ minRating: filters.minRating === 4.5 ? undefined : 4.5 })
          }
        >
          4.5+
        </Chip>
      </div>

      <div className="ob-discovery-filters__chips" role="group" aria-label="Sort by">
        <Text variant="caption" className="ob-discovery-filters__sort-label">
          Sort
        </Text>
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            selected={filters.sort === option.id}
            onClick={() => setFilters({ sort: option.id })}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}
