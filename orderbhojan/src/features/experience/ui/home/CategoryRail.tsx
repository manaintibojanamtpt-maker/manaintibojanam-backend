import { FOOD_CATEGORIES } from '../../data/mockCatalog';
import { useCategoryStore } from '../../store/categoryStore';
import type { FoodCategoryId } from '../../domain/experience.types';

export function CategoryRail() {
  const { selectedId, select } = useCategoryStore();

  return (
    <section className="ob-section ob-section--full" aria-label="Food categories">
      <div className="ob-section__header">
        <h2 className="bds-text-subtitle ob-section__title">What&apos;s on your mind?</h2>
        <p className="bds-text-caption ob-section__hint">Swipe</p>
      </div>
      <div className="bds-rail ob-category-rail">
        {FOOD_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`bds-chip ob-category-chip${selectedId === category.id ? ' bds-chip--selected' : ''}`}
            aria-pressed={selectedId === category.id}
            onClick={() => select(category.id as FoodCategoryId)}
          >
            <span className="ob-category-chip__emoji" aria-hidden>{category.emoji}</span>
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
}
