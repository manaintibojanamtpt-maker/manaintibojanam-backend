import React from 'react';
import type { MarketplaceSearchSort } from '../../lib/marketplace/searchFilterTypes';

interface MarketplaceSearchSortSelectorProps {
  readonly value: MarketplaceSearchSort;
  readonly onChange: (sort: MarketplaceSearchSort) => void;
  readonly disabled?: boolean;
}

const SORT_OPTIONS: Array<{ value: MarketplaceSearchSort; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
];

export const MarketplaceSearchSortSelector: React.FC<MarketplaceSearchSortSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-white/50">Sort by</span>
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            value === option.value
              ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-[#FF7A00]'
              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default MarketplaceSearchSortSelector;
