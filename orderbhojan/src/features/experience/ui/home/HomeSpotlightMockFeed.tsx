import type { FoodCategoryId } from '../../domain/experience.types';
import { useFeaturedRestaurants } from '../../hooks/useMockExperienceQuery';
import { matchesHomeCategory } from '../../utils/homeCategoryFilter';
import {
  HOME_SPOTLIGHT_SPARSE_COPY,
  resolveHomeSpotlightMode,
} from '../../utils/homeSpotlightFeed';
import { FeaturedRestaurantsSection } from './FeaturedRestaurantsSection';
import { TrendingFoodsSection } from './TrendingFoodsSection';
import { HomeKitchenSpotlightMock } from './HomeKitchenSpotlightMock';
import { OrderBhojanHomeCategories, OrderBhojanHomeFeedSkeleton } from '@/presentation/discovery';
import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

export interface HomeSpotlightMockFeedProps {
  readonly categoryId: FoodCategoryId | null;
}

function MockCategoriesStrip() {
  return (
    <div className="pt-1">
      <OrderBhojanHomeCategories compact />
    </div>
  );
}

export function HomeSpotlightMockFeed({ categoryId }: HomeSpotlightMockFeedProps) {
  const query = useFeaturedRestaurants();

  if (query.isPending && !query.data) {
    return <OrderBhojanHomeFeedSkeleton />;
  }

  if (query.isError) {
    return (
      <OrderBhojanDiscoveryUxState
        variant="error"
        title="Could not load kitchens"
        description="Check your connection and try again."
        primaryLabel="Retry"
        onPrimary={() => void query.refetch()}
      />
    );
  }

  if (!query.data?.length) {
    return (
      <OrderBhojanDiscoveryUxState
        variant="no-restaurants"
        title="No kitchens available"
        description="Try again later or change your category filter."
        primaryLabel="Retry"
        onPrimary={() => void query.refetch()}
      />
    );
  }

  const filtered = query.data.filter((r) => matchesHomeCategory(r.categoryIds, categoryId));
  const mode = resolveHomeSpotlightMode(filtered.length);

  if (mode === 'single' && filtered[0]) {
    return (
      <div className="space-y-3">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Popular Near You</h2>
          <span className="text-xs font-semibold text-[#e85d04]">View all</span>
        </header>
        <HomeKitchenSpotlightMock restaurant={filtered[0]} sparseCopy={HOME_SPOTLIGHT_SPARSE_COPY} />
        <MockCategoriesStrip />
        <TrendingFoodsSection categoryId={categoryId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FeaturedRestaurantsSection categoryId={categoryId} showCategoriesAfter />
      <TrendingFoodsSection categoryId={categoryId} />
    </div>
  );
}
