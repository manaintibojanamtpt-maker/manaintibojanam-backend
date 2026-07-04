import { Button, Chip, Text } from '@bhojan/design-system';
import type { SearchFilters, SearchSort } from '@/types/marketplace-search';
import { SEARCH_SORT_OPTIONS } from '../domain/filters';
import { useSearchFilterStore } from '../store/searchStore';
import { trackSearchEvent } from '../analytics/searchAnalytics';

export function SearchFiltersBar() {
  const filters = useSearchFilterStore((s) => s.filters);
  const setFilters = useSearchFilterStore((s) => s.setFilters);
  const resetFilters = useSearchFilterStore((s) => s.resetFilters);

  const apply = (patch: Partial<SearchFilters>, keys: string[]) => {
    setFilters(patch);
    trackSearchEvent('search_filter_apply', { filterKeys: keys });
  };

  const activeCount = [
    filters.vegOnly,
    filters.nonVegOnly,
    filters.cloudKitchenOnly,
    filters.openNowOnly,
    filters.offersOnly,
    filters.minRating != null,
    filters.maxDistanceKm != null,
    filters.priceRange != null,
  ].filter(Boolean).length;

  return (
    <section className="ob-search-filters" aria-label="Search filters">
      <div className="ob-search-filters__row">
        <Text variant="caption" className="ob-search-filters__label">
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
        {activeCount > 0 ? (
          <Button variant="ghost" size="compact" onClick={resetFilters}>
            Clear
          </Button>
        ) : null}
      </div>
      <div className="ob-search-filters__chips" role="group" aria-label="Quick filters">
        <Chip
          selected={Boolean(filters.openNowOnly)}
          onClick={() => apply({ openNowOnly: !filters.openNowOnly }, ['openNowOnly'])}
        >
          Open now
        </Chip>
        <Chip
          selected={Boolean(filters.vegOnly)}
          onClick={() =>
            apply({ vegOnly: !filters.vegOnly, nonVegOnly: false }, ['vegOnly'])
          }
        >
          Veg
        </Chip>
        <Chip
          selected={Boolean(filters.nonVegOnly)}
          onClick={() =>
            apply({ nonVegOnly: !filters.nonVegOnly, vegOnly: false }, ['nonVegOnly'])
          }
        >
          Non-Veg
        </Chip>
        <Chip
          selected={Boolean(filters.cloudKitchenOnly)}
          onClick={() =>
            apply({ cloudKitchenOnly: !filters.cloudKitchenOnly }, ['cloudKitchenOnly'])
          }
        >
          Cloud kitchen
        </Chip>
        <Chip
          selected={Boolean(filters.offersOnly)}
          onClick={() => apply({ offersOnly: !filters.offersOnly }, ['offersOnly'])}
        >
          Offers
        </Chip>
        <Chip
          selected={filters.minRating === 4.5}
          onClick={() =>
            apply(
              { minRating: filters.minRating === 4.5 ? undefined : 4.5 },
              ['minRating'],
            )
          }
        >
          4.5+
        </Chip>
        <Chip
          selected={filters.maxDistanceKm === 3}
          onClick={() =>
            apply(
              { maxDistanceKm: filters.maxDistanceKm === 3 ? undefined : 3 },
              ['maxDistanceKm'],
            )
          }
        >
          Within 3 km
        </Chip>
        <Chip
          selected={filters.maxDeliveryFee === 20}
          onClick={() =>
            apply(
              { maxDeliveryFee: filters.maxDeliveryFee === 20 ? undefined : 20 },
              ['maxDeliveryFee'],
            )
          }
        >
          Low fee
        </Chip>
        <Chip
          selected={filters.priceRange === 'budget'}
          onClick={() =>
            apply(
              { priceRange: filters.priceRange === 'budget' ? undefined : 'budget' },
              ['priceRange'],
            )
          }
        >
          Budget
        </Chip>
      </div>
      <div className="ob-search-filters__chips" role="group" aria-label="Sort by">
        <Text variant="caption" className="ob-search-filters__sort-label">
          Sort
        </Text>
        {SEARCH_SORT_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            selected={filters.sort === option.id}
            onClick={() => apply({ sort: option.id as SearchSort }, ['sort'])}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}
