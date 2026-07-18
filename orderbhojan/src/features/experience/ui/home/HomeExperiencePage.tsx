import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed, useDiscoveryHome } from '@/features/discovery';
import { useLocationActions, useLocationFeatureEnabled, useActiveLocation } from '@/features/location';
import { useCategoryStore } from '../../store/categoryStore';
import type { FoodCategoryId } from '../../domain/experience.types';
import { HomeSpotlightMockFeed } from './HomeSpotlightMockFeed';
import {
  OrderBhojanHomeHero,
  OrderBhojanHomeTrustStrip,
} from '@/presentation/discovery';
import { preloadMarketplaceRouteChunks } from '@/lib/preloadRouteChunks';

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
    preloadMarketplaceRouteChunks();
  }, []);

  useEffect(() => {
    if (!locationEnabled || searchParams.get('openLocation') !== '1') return;
    openSelector();
    const next = new URLSearchParams(searchParams);
    next.delete('openLocation');
    setSearchParams(next, { replace: true });
  }, [locationEnabled, openSelector, searchParams, setSearchParams]);

  useEffect(() => {
    if (!locationEnabled || !discoveryEnabled || locationPromptedRef.current) return;
    if (activeLocation || discoveryQuery.isPending || discoveryQuery.isFetching) return;
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
    discoveryQuery.isPending,
    locationEnabled,
    openSelector,
  ]);

  return (
    <div className="bg-[#030303] pb-6 text-white">
      <OrderBhojanHomeHero />

      <div className="px-4 pt-4 sm:px-6">
        {discoveryEnabled ? (
          <DiscoveryHomeFeed />
        ) : (
          <MockRestaurantFeed categoryId={selectedId} />
        )}
      </div>

      <section className="mt-10 border-t border-white/5 px-4 pt-8 sm:px-6" aria-label="Why OrderBhojan">
        <div className="mb-4 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Trust</p>
          <h2 className="text-base font-bold text-white/90">Why OrderBhojan</h2>
          <p className="text-xs text-white/45">Verified home kitchens with the warmth you expect</p>
        </div>
        <OrderBhojanHomeTrustStrip />
      </section>
    </div>
  );
}
