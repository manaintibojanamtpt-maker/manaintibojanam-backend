import { Rail, Text } from '@bhojan/design-system';
import type { FoodCategoryId } from '../../domain/experience.types';
import { useFeaturedRestaurants } from '../../hooks/useMockExperienceQuery';
import { matchesHomeCategory } from '../../utils/homeCategoryFilter';
import { HomeRestaurantPoster } from './HomeRestaurantPoster';
import { RestaurantRailSkeleton } from '../shared/ExperienceSkeletons';

export interface FeaturedRestaurantsSectionProps {
  readonly categoryId?: FoodCategoryId | null;
}

export function FeaturedRestaurantsSection({ categoryId = null }: FeaturedRestaurantsSectionProps) {
  const query = useFeaturedRestaurants();

  if (query.isLoading) {
    return <RestaurantRailSkeleton title="Near you" />;
  }

  if (query.isError) {
    return null;
  }

  return (
    <section className="ob-home-restaurants" aria-label="Restaurants near you">
      <Text variant="titleSm" as="h2" className="ob-home-restaurants__title">
        Near you
      </Text>
      <Rail className="ob-home-restaurants__rail">
        {query.data?.map((restaurant) => {
          const matches = matchesHomeCategory(restaurant.categoryIds, categoryId);
          return (
            <div
              key={restaurant.id}
              className={matches ? 'ob-home-feed__item' : 'ob-home-feed__item ob-home-feed__item--dimmed'}
            >
              <HomeRestaurantPoster restaurant={restaurant} />
            </div>
          );
        })}
      </Rail>
    </section>
  );
}
