import type { MenuDietaryFilter } from '@/features/food/domain/formatters';

const OPTIONS: readonly { id: MenuDietaryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'veg', label: 'Veg' },
  { id: 'nonVeg', label: 'Non-Veg' },
];

function segmentClass(active: boolean): string {
  return `flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide transition touch-manipulation ${
    active
      ? 'bg-[#e85d04] text-[#120e0c] shadow-[0_0_20px_rgba(232,93,4,0.35)]'
      : 'text-white/70 hover:text-white'
  }`;
}

export interface OrderBhojanFoodDietaryFilterBarProps {
  readonly value: MenuDietaryFilter;
  readonly onChange: (value: MenuDietaryFilter) => void;
  readonly vegCount: number;
  readonly nonVegCount: number;
}

export function OrderBhojanFoodDietaryFilterBar({
  value,
  onChange,
  vegCount,
  nonVegCount,
}: OrderBhojanFoodDietaryFilterBarProps) {
  const counts: Record<MenuDietaryFilter, number> = {
    all: vegCount + nonVegCount,
    veg: vegCount,
    nonVeg: nonVegCount,
  };

  return (
    <div
      className="ob-menu-container min-w-0 max-w-full pb-3"
      role="group"
      aria-label="Filter menu by dietary preference"
    >
      <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
        {OPTIONS.map((option) => {
          const active = value === option.id;
          const count = counts[option.id];
          return (
            <button
              key={option.id}
              type="button"
              className={segmentClass(active)}
              aria-pressed={active}
              disabled={option.id !== 'all' && count === 0}
              onClick={() => onChange(option.id)}
            >
              {option.label}
              {count > 0 ? ` · ${count}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
