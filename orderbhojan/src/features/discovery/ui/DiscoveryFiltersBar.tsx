import { useMemo, useState, type ReactNode } from 'react';
import { SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import BottomSheet from '@bhojan/storefront-design-system/layout/BottomSheet';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import type { DiscoverySort } from '@/types/marketplace-discovery';
import type { KitchenFormat } from '@/types/marketplace';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM } from '../domain/discoveryPolicy';
import { DEFAULT_DISCOVERY_FILTERS } from '../domain/filters';

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

function ControlPill({
  active,
  onClick,
  icon,
  children,
  ariaLabel,
}: {
  readonly active?: boolean;
  readonly onClick: () => void;
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-white'
          : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SheetOption({
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
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
        selected
          ? 'border-[#FF7A00]/50 bg-[#FF7A00]/10 text-white'
          : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20'
      }`}
    >
      {children}
      {selected ? <span className="text-xs font-bold uppercase tracking-wide text-[#FF7A00]">Active</span> : null}
    </button>
  );
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  readonly label: string;
  readonly onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Remove ${label} filter`}
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:border-[#FF7A00]/50"
    >
      {label}
      <X className="h-3 w-3 text-[#FF7A00]" aria-hidden />
    </button>
  );
}

export function DiscoveryFiltersBar() {
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const setFilters = useDiscoveryFilterStore((s) => s.setFilters);
  const resetFilters = useDiscoveryFilterStore((s) => s.resetFilters);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const activeFilterCount = [
    filters.vegOnly,
    filters.kitchenFormat,
    filters.offersOnly,
    filters.openNowOnly,
    filters.minRating != null,
    filters.maxDistanceKm != null && filters.maxDistanceKm < CONSUMER_MAX_DISCOVERY_DISTANCE_KM,
  ].filter(Boolean).length;

  const sortLabel =
    SORT_OPTIONS.find((option) => option.id === (filters.sort ?? DEFAULT_DISCOVERY_FILTERS.sort))?.label ??
    'Nearest';

  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];

    if (filters.kitchenFormat) {
      const label =
        KITCHEN_FORMAT_OPTIONS.find((option) => option.id === filters.kitchenFormat)?.label ??
        filters.kitchenFormat;
      chips.push({
        id: 'kitchenFormat',
        label,
        onRemove: () => setFilters({ kitchenFormat: undefined, cloudKitchenOnly: false }),
      });
    }
    if (filters.openNowOnly) {
      chips.push({
        id: 'openNowOnly',
        label: 'Open now',
        onRemove: () => setFilters({ openNowOnly: false }),
      });
    }
    if (filters.vegOnly) {
      chips.push({
        id: 'vegOnly',
        label: 'Veg',
        onRemove: () => setFilters({ vegOnly: false }),
      });
    }
    if (filters.offersOnly) {
      chips.push({
        id: 'offersOnly',
        label: 'Offers',
        onRemove: () => setFilters({ offersOnly: false }),
      });
    }
    if (filters.minRating === 4.5) {
      chips.push({
        id: 'minRating',
        label: '4.5+',
        onRemove: () => setFilters({ minRating: undefined }),
      });
    }

    return chips;
  }, [filters, setFilters]);

  return (
    <section className="space-y-3" aria-label="Restaurant filters">
      <div className="flex items-center gap-2">
        <ControlPill
          active={activeFilterCount > 0}
          onClick={() => setFiltersOpen(true)}
          icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
          ariaLabel="Open filters"
        >
          Filters
          {activeFilterCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF7A00] px-1 text-[10px] font-bold text-black">
              {activeFilterCount}
            </span>
          ) : null}
        </ControlPill>

        <ControlPill
          active={(filters.sort ?? DEFAULT_DISCOVERY_FILTERS.sort) !== 'distance'}
          onClick={() => setSortOpen(true)}
          icon={<ArrowUpDown className="h-4 w-4" aria-hidden />}
          ariaLabel="Open sort options"
        >
          {sortLabel}
        </ControlPill>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Active filters">
          {activeChips.map((chip) => (
            <span key={chip.id} role="listitem">
              <ActiveFilterChip label={chip.label} onRemove={chip.onRemove} />
            </span>
          ))}
          <SoftButton type="button" tone="ghost" size="compact" onClick={resetFilters}>
            Clear all
          </SoftButton>
        </div>
      ) : null}

      <BottomSheet
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        panelClassName="bg-[#120e0c] text-white"
      >
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Kitchen type</p>
            <div className="grid gap-2">
              {KITCHEN_FORMAT_OPTIONS.map((option) => (
                <SheetOption
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
                </SheetOption>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Quick filters</p>
            <div className="grid gap-2">
              <SheetOption
                selected={Boolean(filters.openNowOnly)}
                onClick={() => setFilters({ openNowOnly: !filters.openNowOnly })}
              >
                Open now
              </SheetOption>
              <SheetOption
                selected={Boolean(filters.vegOnly)}
                onClick={() => setFilters({ vegOnly: !filters.vegOnly })}
              >
                Veg
              </SheetOption>
              <SheetOption
                selected={Boolean(filters.offersOnly)}
                onClick={() => setFilters({ offersOnly: !filters.offersOnly })}
              >
                Offers
              </SheetOption>
              <SheetOption
                selected={filters.minRating === 4.5}
                onClick={() => setFilters({ minRating: filters.minRating === 4.5 ? undefined : 4.5 })}
              >
                Rating 4.5+
              </SheetOption>
            </div>
          </div>

          <SoftButton type="button" tone="ghost" fullWidth onClick={() => setFiltersOpen(false)}>
            Done
          </SoftButton>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort by"
        panelClassName="bg-[#120e0c] text-white"
      >
        <div className="grid gap-2">
          {SORT_OPTIONS.map((option) => (
            <SheetOption
              key={option.id}
              selected={(filters.sort ?? DEFAULT_DISCOVERY_FILTERS.sort) === option.id}
              onClick={() => {
                setFilters({ sort: option.id });
                setSortOpen(false);
              }}
            >
              {option.label}
            </SheetOption>
          ))}
        </div>
      </BottomSheet>
    </section>
  );
}
