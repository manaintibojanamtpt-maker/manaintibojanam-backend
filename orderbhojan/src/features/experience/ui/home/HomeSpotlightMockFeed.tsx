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
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
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
      <div className="space-y-5">
        <header className="space-y-1">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Nearby kitchens</h2>
              <p className="text-xs text-white/50">Home kitchens cooking for your area</p>
            </div>
            <span className="text-xs font-semibold text-[#FF7A00]">1 kitchen</span>
          </div>
        </header>
        <HomeKitchenSpotlightMock restaurant={filtered[0]} sparseCopy={HOME_SPOTLIGHT_SPARSE_COPY} />
        <MockCategoriesStrip />
        <TrendingFoodsSection categoryId={categoryId} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FeaturedRestaurantsSection categoryId={categoryId} showCategoriesAfter />
      <TrendingFoodsSection categoryId={categoryId} />
    </div>
  );
}
