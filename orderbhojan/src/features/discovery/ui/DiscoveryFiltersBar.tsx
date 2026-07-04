import { Button, Chip, Text } from '@bhojan/design-system';
import type { DiscoverySort } from '@/types/marketplace-discovery';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';

const SORT_OPTIONS: { id: DiscoverySort; label: string }[] = [
  { id: 'popularity', label: 'Popular' },
  { id: 'eta', label: 'Fastest' },
  { id: 'distance', label: 'Nearest' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
  { id: 'alphabetical', label: 'A–Z' },
];

export function DiscoveryFiltersBar() {
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const setFilters = useDiscoveryFilterStore((s) => s.setFilters);
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);

  const activeCount = [
    filters.vegOnly,
    filters.cloudKitchenOnly,
    filters.offersOnly,
    filters.openNowOnly,
    filters.minRating != null,
    filters.maxDistanceKm != null,
  ].filter(Boolean).length;

  return (
    <section
      className="ob-section ob-section--full ob-discovery-filters"
      aria-label="Restaurant filters"
    >
      <div className="ob-discovery-filters__row">
        <Text variant="caption" className="ob-discovery-filters__label">
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
        {activeCount > 0 ? (
          <Button variant="ghost" size="compact" onClick={resetFilters}>
            Clear
          </Button>
        ) : null}
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
          selected={Boolean(filters.cloudKitchenOnly)}
          onClick={() => setFilters({ cloudKitchenOnly: !filters.cloudKitchenOnly })}
        >
          Cloud kitchen
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
        <Chip
          selected={filters.maxDistanceKm === 3}
          onClick={() =>
            setFilters({ maxDistanceKm: filters.maxDistanceKm === 3 ? undefined : 3 })
          }
        >
          Within 3 km
        </Chip>
        <Chip
          selected={filters.maxDeliveryFee === 20}
          onClick={() =>
            setFilters({
              maxDeliveryFee: filters.maxDeliveryFee === 20 ? undefined : 20,
            })
          }
        >
          Low delivery fee
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
