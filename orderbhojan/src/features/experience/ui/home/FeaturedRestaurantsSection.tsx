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
    <section className="space-y-4" aria-label="Nearby kitchens">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Nearby kitchens</h2>
          <p className="text-xs text-white/50">Home kitchens cooking for your area</p>
        </div>
        <span className="text-xs font-semibold text-[#FF7A00]">
          {visible.length} {visible.length === 1 ? 'kitchen' : 'kitchens'}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {visible.map((restaurant) => (
          <OrderBhojanMockKitchenCard key={restaurant.id} restaurant={restaurant} variant="grid" className="w-full" />
        ))}
      </div>

      {showCategoriesAfter ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
          <OrderBhojanHomeCategories compact />
        </div>
      ) : null}
    </section>
  );
}
