import { Rail, Text } from '@bhojan/design-system';
import type { FoodCategoryId } from '../../domain/experience.types';
import { useTrendingFoods } from '../../hooks/useMockExperienceQuery';
import { matchesHomeCategory } from '../../utils/homeCategoryFilter';
import { HomeDishPoster } from './HomeDishPoster';
import { MenuSkeleton } from '../shared/ExperienceSkeletons';

export interface TrendingFoodsSectionProps {
  readonly categoryId?: FoodCategoryId | null;
}

export function TrendingFoodsSection({ categoryId = null }: TrendingFoodsSectionProps) {
  const query = useTrendingFoods();

  return (
    <section className="ob-home-dishes" aria-label="Popular dishes">
      <Text variant="titleSm" as="h2" className="ob-home-dishes__title">
        Popular dishes
      </Text>
      {query.isLoading ? (
        <MenuSkeleton />
      ) : (
        <Rail className="ob-home-dishes__rail">
          {query.data?.map((item) => {
            const matches = matchesHomeCategory(item.categoryIds, categoryId);
            return (
              <div
                key={item.id}
                className={matches ? 'ob-home-feed__item' : 'ob-home-feed__item ob-home-feed__item--dimmed'}
              >
                <HomeDishPoster item={item} />
              </div>
            );
          })}
        </Rail>
      )}
    </section>
  );
}
