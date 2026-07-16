import type { FoodCategoryId } from '../../domain/experience.types';
import { useFeaturedRestaurants } from '../../hooks/useMockExperienceQuery';
import { matchesHomeCategory } from '../../utils/homeCategoryFilter';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { OrderBhojanHomeFeedSkeleton } from '@/presentation/discovery';
import { OrderBhojanMockKitchenCard } from '@/presentation/discovery/OrderBhojanMockKitchenCard';
import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

export interface FeaturedRestaurantsSectionProps {
  readonly categoryId?: FoodCategoryId | null;
}

export function FeaturedRestaurantsSection({ categoryId = null }: FeaturedRestaurantsSectionProps) {
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
        description="Try selecting a different category above."
        compact
      />
    );
  }

  return (
    <Section density="comfortable" background="default" className="!py-8">
      <SectionHeader title="Near you" align="left" className="!mb-6 !text-left" />
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible xl:grid-cols-3">
        {visible.map((restaurant) => (
          <OrderBhojanMockKitchenCard
            key={restaurant.id}
            restaurant={restaurant}
            width="17.5rem"
            className="lg:w-full lg:min-w-0"
          />
        ))}
      </div>
    </Section>
  );
}
