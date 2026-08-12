import type { FoodCategoryPublic } from '@/types/marketplace-food';

const chipClass = (active: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
    active
      ? 'border-[#e85d04]/55 bg-[#e85d04]/18 text-[#fff8f0] shadow-[0_0_0_1px_rgba(232,93,4,0.12)]'
      : 'border-white/10 bg-[#120d0c]/60 text-[#c4b5a5] hover:border-[#e85d04]/30 hover:text-[#fff8f0]'
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
      className={`${embedded ? '' : 'sticky top-0 z-30 border-b border-white/[0.08] bg-[#050403]/95 backdrop-blur-md'} min-w-0 max-w-full py-2 ob-menu-container`}
      aria-label="Menu categories"
    >
      <div className="ob-menu-rail-bleed">
        <div className="ob-menu-rail-scroll flex gap-2 pb-1 no-scrollbar">
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
      </div>
    </nav>
  );
}
