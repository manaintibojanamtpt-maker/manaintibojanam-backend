import { Link } from 'react-router-dom';
import type { FoodCategoryId } from '../../domain/experience.types';
import { useFeaturedRestaurants } from '../../hooks/useMockExperienceQuery';
import { matchesHomeCategory } from '../../utils/homeCategoryFilter';
import { OrderBhojanHomeCategories, OrderBhojanHomeFeedSkeleton } from '@/presentation/discovery';
import { OrderBhojanMockKitchenCard } from '@/presentation/discovery/OrderBhojanMockKitchenCard';
import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

export interface FeaturedRestaurantsSectionProps {
  readonly categoryId?: FoodCategoryId | null;
  readonly showCategoriesAfter?: boolean;
}

export function FeaturedRestaurantsSection({
  categoryId = null,
  showCategoriesAfter = false,
}: FeaturedRestaurantsSectionProps) {
  const query = useFeaturedRestaurants();

  if (query.isPending && !query.data) {
    return <OrderBhojanHomeFeedSkeleton />;
  }

  if (query.isError) {
    return (
      <OrderBhojanDiscoveryUxState
        variant="error"
        title="Could not load featured kitchens"
        description="Check your connection and try again."
        primaryLabel="Retry"
        onPrimary={() => void query.refetch()}
        compact
      />
    );
  }

  const visible = query.data?.filter((r) => matchesHomeCategory(r.categoryIds, categoryId)) ?? [];
  if (visible.length === 0) {
    return (
      <OrderBhojanDiscoveryUxState
        variant="empty"
        title="No kitchens in this category"
        description="Try selecting a different category below."
        compact
      />
    );
  }

  return (
    <section className="space-y-1" aria-label="Popular Near You">
      <header className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white">Popular Near You</h2>
        <Link to="/search" className="shrink-0 text-xs font-semibold text-[#e85d04] touch-manipulation">
          View all
        </Link>
      </header>

      <div className="divide-y divide-white/[0.06]">
        {visible.map((restaurant) => (
          <OrderBhojanMockKitchenCard
            key={restaurant.id}
            restaurant={restaurant}
            variant="list"
            className="w-full !border-b-0"
          />
        ))}
      </div>

      {showCategoriesAfter ? (
        <div className="pt-3">
          <OrderBhojanHomeCategories compact />
        </div>
      ) : null}
    </section>
  );
}
