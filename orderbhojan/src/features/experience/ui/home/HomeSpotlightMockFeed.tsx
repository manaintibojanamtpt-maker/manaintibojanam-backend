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
import { OrderBhojanHomeFeedSkeleton } from '@/presentation/discovery';
import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

export interface HomeSpotlightMockFeedProps {
  readonly categoryId: FoodCategoryId | null;
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
      <>
        <HomeKitchenSpotlightMock
          restaurant={filtered[0]}
          sparseCopy={HOME_SPOTLIGHT_SPARSE_COPY}
        />
        <TrendingFoodsSection categoryId={categoryId} />
      </>
    );
  }

  if (mode === 'dual') {
    return (
      <>
        <FeaturedRestaurantsSection categoryId={categoryId} />
        <TrendingFoodsSection categoryId={categoryId} />
      </>
    );
  }

  if (mode === 'sparse') {
    return (
      <>
        <FeaturedRestaurantsSection categoryId={categoryId} />
        <TrendingFoodsSection categoryId={categoryId} />
      </>
    );
  }

  return (
    <>
      <FeaturedRestaurantsSection categoryId={categoryId} />
      <TrendingFoodsSection categoryId={categoryId} />
    </>
  );
}
