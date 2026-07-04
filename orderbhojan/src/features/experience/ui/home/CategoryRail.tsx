import { Chip, Rail, Text } from '@bhojan/design-system';
import { FOOD_CATEGORIES } from '../../data/mockCatalog';
import { useCategoryStore } from '../../store/categoryStore';
import type { FoodCategoryId } from '../../domain/experience.types';

export function CategoryRail() {
  const { selectedId, select } = useCategoryStore();

  return (
    <section className="ob-section ob-section--full" aria-label="Food categories">
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">What&apos;s on your mind?</Text>
        <Text variant="caption" className="ob-section__hint">Swipe</Text>
      </div>
      <Rail className="ob-category-rail bds-rail">
        {FOOD_CATEGORIES.map((category) => (
          <Chip
            key={category.id}
            selected={selectedId === category.id}
            className="ob-category-chip"
            aria-pressed={selectedId === category.id}
            onClick={() => select(category.id as FoodCategoryId)}
          >
            <span className="ob-category-chip__emoji" aria-hidden>{category.emoji}</span>
            {category.label}
          </Chip>
        ))}
      </Rail>
    </section>
  );
}
