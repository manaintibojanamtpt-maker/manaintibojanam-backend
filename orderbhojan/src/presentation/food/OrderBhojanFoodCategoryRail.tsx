import type { FoodCategoryPublic } from '@/types/marketplace-food';

const chipClass = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-white'
      : 'border-white/10 bg-white/5 text-white/70 hover:border-[#FF7A00]/30 hover:text-white'
  }`;

export interface OrderBhojanFoodCategoryRailProps {
  readonly categories: readonly FoodCategoryPublic[];
  readonly activeId: string;
  readonly onSelect: (sectionId: string) => void;
  readonly embedded?: boolean;
}

export function OrderBhojanFoodCategoryRail({
  categories,
  activeId,
  onSelect,
  embedded = false,
}: OrderBhojanFoodCategoryRailProps) {
  return (
    <nav
      className={`${embedded ? '' : 'sticky top-0 z-30 border-b border-white/10 bg-[#030303]/95 backdrop-blur-md'} py-3 ob-menu-container`}
      aria-label="Menu categories"
    >
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((category) => {
          const sectionId = `food-cat-${category.id}`;
          const active = activeId === sectionId;
          return (
            <button
              key={category.id}
              type="button"
              className={chipClass(active)}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(sectionId)}
            >
              {category.name}
              {category.itemCount != null ? ` · ${category.itemCount}` : ''}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
