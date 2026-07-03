import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { MarketplaceSearchFilterState } from '../../lib/marketplace/searchFilterTypes';

interface MarketplaceSearchFilterChipsProps {
  readonly filters: MarketplaceSearchFilterState;
  readonly activeFilterCount: number;
  readonly onToggleOpenNow: () => void;
  readonly onToggleVegOnly: () => void;
  readonly onOpenDrawer: () => void;
}

const chipClass = (active: boolean) =>
  active
    ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-[#FF7A00]'
    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20';

export const MarketplaceSearchFilterChips: React.FC<MarketplaceSearchFilterChipsProps> = ({
  filters,
  activeFilterCount,
  onToggleOpenNow,
  onToggleVegOnly,
  onOpenDrawer,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleOpenNow}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${chipClass(filters.openNow)}`}
      >
        Open Now
      </button>
      <button
        type="button"
        onClick={onToggleVegOnly}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${chipClass(filters.vegOnly)}`}
      >
        Veg Only
      </button>
      <button
        type="button"
        onClick={onOpenDrawer}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${chipClass(activeFilterCount > 2)}`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        More filters
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-[#FF7A00] px-1.5 text-[10px] font-semibold text-black">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default MarketplaceSearchFilterChips;
