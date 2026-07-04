import { Badge } from '@bhojan/design-system';
import type { FoodCategoryPublic } from '@/types/marketplace-food';

interface FoodCategoryRailProps {
  readonly categories: readonly FoodCategoryPublic[];
  readonly activeId: string;
  readonly onSelect: (sectionId: string) => void;
}

export function FoodCategoryRail({ categories, activeId, onSelect }: FoodCategoryRailProps) {
  return (
    <nav className="ob-food-rail" aria-label="Menu categories">
      <div className="ob-food-rail__track" role="tablist">
        {categories.map((category) => {
          const sectionId = `food-cat-${category.id}`;
          const active = activeId === sectionId;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`ob-food-rail__chip${active ? ' ob-food-rail__chip--active' : ''}`}
              onClick={() => onSelect(sectionId)}
            >
              {category.name}
              <Badge variant="default">{category.itemCount}</Badge>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
