import type { ReactNode } from 'react';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
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

function FilterChip({
  selected,
  onClick,
  children,
}: {
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        selected
          ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-white'
          : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20'
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

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
    <section className="flex flex-col gap-4" aria-label="Restaurant filters">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/60">
          Within {CONSUMER_MAX_DISCOVERY_DISTANCE_KM} km
          {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? '' : 's'}` : ''}
        </p>
        {activeCount > 0 ? (
          <SoftButton type="button" tone="ghost" size="compact" onClick={resetFilters}>
            Clear all
          </SoftButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Kitchen type">
        <span className="w-full text-xs font-semibold uppercase tracking-wide text-white/50">Kitchen</span>
        {KITCHEN_FORMAT_OPTIONS.map((option) => (
          <FilterChip
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
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick filters">
        <FilterChip selected={Boolean(filters.openNowOnly)} onClick={() => setFilters({ openNowOnly: !filters.openNowOnly })}>
          Open now
        </FilterChip>
        <FilterChip selected={Boolean(filters.vegOnly)} onClick={() => setFilters({ vegOnly: !filters.vegOnly })}>
          Veg
        </FilterChip>
        <FilterChip selected={Boolean(filters.offersOnly)} onClick={() => setFilters({ offersOnly: !filters.offersOnly })}>
          Offers
        </FilterChip>
        <FilterChip
          selected={filters.minRating === 4.5}
          onClick={() => setFilters({ minRating: filters.minRating === 4.5 ? undefined : 4.5 })}
        >
          4.5+
        </FilterChip>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Sort by">
        <span className="w-full text-xs font-semibold uppercase tracking-wide text-white/50">Sort</span>
        {SORT_OPTIONS.map((option) => (
          <FilterChip
            key={option.id}
            selected={filters.sort === option.id}
            onClick={() => setFilters({ sort: option.id })}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </section>
  );
}
