import { Rail, Text } from '@bhojan/design-system';
import { useFeaturedRestaurants } from '../../hooks/useMockExperienceQuery';
import { MarketplaceRestaurantTile } from '../shared/MarketplaceRestaurantTile';
import { RestaurantRailSkeleton } from '../shared/ExperienceSkeletons';

export function FeaturedRestaurantsSection() {
  const query = useFeaturedRestaurants();

  if (query.isLoading) {
    return <RestaurantRailSkeleton title="Featured Restaurants" />;
  }

  if (query.isError) {
    return null;
  }

  return (
    <section className="ob-section ob-section--full ob-restaurant-rail" aria-label="Featured restaurants">
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">Featured Restaurants</Text>
        <Text variant="caption" className="ob-section__hint">Curated for you</Text>
      </div>
      <Rail>
        {query.data?.map((restaurant) => (
          <MarketplaceRestaurantTile key={restaurant.id} restaurant={restaurant} />
        ))}
      </Rail>
    </section>
  );
}
