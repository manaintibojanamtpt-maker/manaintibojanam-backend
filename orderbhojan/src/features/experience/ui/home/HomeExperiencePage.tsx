import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed, useDiscoveryHome } from '@/features/discovery';
import { useLocationActions, useLocationFeatureEnabled, useActiveLocation } from '@/features/location';
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
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const discoveryQuery = useDiscoveryHome();
  const { openSelector } = useLocationActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedId } = useCategoryStore();
  const locationPromptedRef = useRef(false);

  useEffect(() => {
    if (!locationEnabled || searchParams.get('openLocation') !== '1') return;
    openSelector();
    const next = new URLSearchParams(searchParams);
    next.delete('openLocation');
    setSearchParams(next, { replace: true });
  }, [locationEnabled, openSelector, searchParams, setSearchParams]);

  useEffect(() => {
    if (!locationEnabled || !discoveryEnabled || locationPromptedRef.current) return;
    if (activeLocation || discoveryQuery.isLoading || discoveryQuery.isFetching) return;
    const collections = discoveryQuery.data?.collections ?? [];
    const hasKitchens = collections.some((collection) => collection.restaurants.length > 0);
    if (hasKitchens) return;
    locationPromptedRef.current = true;
    openSelector();
  }, [
    activeLocation,
    discoveryEnabled,
    discoveryQuery.data?.collections,
    discoveryQuery.isFetching,
    discoveryQuery.isLoading,
    locationEnabled,
    openSelector,
  ]);

  return (
    <div className="bg-[#030303] pb-6 text-white">
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
