import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed } from '@/features/discovery';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { useCategoryStore } from '../../store/categoryStore';
import type { FoodCategoryId } from '../../domain/experience.types';
import { HomeSpotlightMockFeed } from './HomeSpotlightMockFeed';
import {
  OrderBhojanHomeHero,
  OrderBhojanHomeCategories,
  OrderBhojanHomeTrustStrip,
} from '@/presentation/discovery';

function MockRestaurantFeed({ categoryId }: { categoryId: FoodCategoryId | null }) {
  return <HomeSpotlightMockFeed categoryId={categoryId} />;
}

export function HomeExperiencePage() {
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const { selectedId } = useCategoryStore();

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <OrderBhojanHomeHero />

      <Section density="comfortable" background="default" className="!py-8">
        <SectionHeader
          label="Categories"
          title="What's on your mind?"
          description="Swipe to explore cuisines near you"
          align="left"
          className="!text-left"
        />
        <OrderBhojanHomeCategories />
      </Section>

      <Section density="comfortable" background="subtle" className="!py-8">
        {discoveryEnabled ? (
          <DiscoveryHomeFeed />
        ) : (
          <MockRestaurantFeed categoryId={selectedId} />
        )}
      </Section>

      <Section density="comfortable" background="default" className="!py-8">
        <SectionHeader
          label="Trust"
          title="Why OrderBhojan"
          description="Verified home kitchens with the warmth you expect"
          align="left"
          className="!text-left"
        />
        <OrderBhojanHomeTrustStrip />
      </Section>
    </div>
  );
}
