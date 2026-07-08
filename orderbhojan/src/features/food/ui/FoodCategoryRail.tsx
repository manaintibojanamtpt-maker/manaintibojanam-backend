import { StickyCategoryRail } from '@bhojan/design-system';
import type { FoodCategoryPublic } from '@/types/marketplace-food';

interface FoodCategoryRailProps {
  readonly categories: readonly FoodCategoryPublic[];
  readonly activeId: string;
  readonly onSelect: (sectionId: string) => void;
}

export function FoodCategoryRail({ categories, activeId, onSelect }: FoodCategoryRailProps) {
  return (
    <StickyCategoryRail
      items={categories.map((category) => ({
        id: `food-cat-${category.id}`,
        label: category.name,
        count: category.itemCount,
      }))}
      activeId={activeId}
      onSelect={onSelect}
    />
  );
}
