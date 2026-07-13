import type { SearchFilters, SearchSort } from '@/types/marketplace-search';
import { SEARCH_SORT_OPTIONS } from '@/features/search/domain/filters';
import { useSearchFilterStore } from '@/features/search/store/searchStore';
import { trackSearchEvent } from '@/features/search/analytics/searchAnalytics';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';

const chipClass = (active: boolean) =>
  active
    ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-[#FF7A00]'
    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20';

export function OrderBhojanSearchFiltersBar() {
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
    filters.maxDeliveryFee != null,
  ].filter(Boolean).length;

  const chips: Array<{ id: string; label: string; active: boolean; onClick: () => void }> = [
    {
      id: 'openNow',
      label: 'Open now',
      active: Boolean(filters.openNowOnly),
      onClick: () => apply({ openNowOnly: !filters.openNowOnly }, ['openNowOnly']),
    },
    {
      id: 'veg',
      label: 'Veg',
      active: Boolean(filters.vegOnly),
      onClick: () => apply({ vegOnly: !filters.vegOnly, nonVegOnly: false }, ['vegOnly']),
    },
    {
      id: 'nonVeg',
      label: 'Non-Veg',
      active: Boolean(filters.nonVegOnly),
      onClick: () => apply({ nonVegOnly: !filters.nonVegOnly, vegOnly: false }, ['nonVegOnly']),
    },
    {
      id: 'cloud',
      label: 'Cloud kitchen',
      active: Boolean(filters.cloudKitchenOnly),
      onClick: () => apply({ cloudKitchenOnly: !filters.cloudKitchenOnly }, ['cloudKitchenOnly']),
    },
    {
      id: 'offers',
      label: 'Offers',
      active: Boolean(filters.offersOnly),
      onClick: () => apply({ offersOnly: !filters.offersOnly }, ['offersOnly']),
    },
    {
      id: 'rating',
      label: '4.5+',
      active: filters.minRating === 4.5,
      onClick: () =>
        apply({ minRating: filters.minRating === 4.5 ? undefined : 4.5 }, ['minRating']),
    },
    {
      id: 'distance',
      label: 'Within 3 km',
      active: filters.maxDistanceKm === 3,
      onClick: () =>
        apply({ maxDistanceKm: filters.maxDistanceKm === 3 ? undefined : 3 }, ['maxDistanceKm']),
    },
    {
      id: 'fee',
      label: 'Low fee',
      active: filters.maxDeliveryFee === 20,
      onClick: () =>
        apply(
          { maxDeliveryFee: filters.maxDeliveryFee === 20 ? undefined : 20 },
          ['maxDeliveryFee'],
        ),
    },
    {
      id: 'budget',
      label: 'Budget',
      active: filters.priceRange === 'budget',
      onClick: () =>
        apply(
          { priceRange: filters.priceRange === 'budget' ? undefined : 'budget' },
          ['priceRange'],
        ),
    },
  ];

  return (
    <section className="space-y-3" aria-label="Search filters">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-white/50">
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </p>
        {activeCount > 0 ? (
          <SoftButton type="button" tone="ghost" size="compact" onClick={resetFilters}>
            Clear
          </SoftButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick filters">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onClick}
            className={`rounded-full border px-3 py-2 text-xs font-medium transition touch-manipulation min-h-10 ${chipClass(chip.active)}`}
            aria-pressed={chip.active}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort by">
        <span className="text-xs font-medium uppercase tracking-widest text-white/40">Sort</span>
        {SEARCH_SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => apply({ sort: option.id as SearchSort }, ['sort'])}
            className={`rounded-full border px-3 py-2 text-xs font-medium transition touch-manipulation min-h-10 ${chipClass(filters.sort === option.id)}`}
            aria-pressed={filters.sort === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
