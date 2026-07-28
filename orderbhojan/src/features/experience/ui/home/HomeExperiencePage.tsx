import { lazy, Suspense, useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDiscoveryFeatureEnabled, DiscoveryHomeFeed, useDiscoveryHome } from '@/features/discovery';
import { useLocationActions, useLocationFeatureEnabled, useActiveLocation, hasActiveDeliveryLocation } from '@/features/location';
import { useCategoryStore } from '../../store/categoryStore';
import type { FoodCategoryId } from '../../domain/experience.types';
import { HomeSpotlightMockFeed } from './HomeSpotlightMockFeed';
import { OrderBhojanHomeHero, OrderBhojanHomeCategories } from '@/presentation/discovery';
import { preloadMarketplaceRouteChunks } from '@/lib/preloadRouteChunks';
import { DEFAULT_LOCATION_DISCOVERY_CTA } from '@/lib/marketplaceDefaults';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';

const LOCATION_NUDGE_DISMISSED_KEY = 'ob-location-nudge-dismissed-v1';

const OrderBhojanHomeTrustStrip = lazy(() =>
  import('@/presentation/discovery/OrderBhojanHomeTrustStrip').then((module) => ({
    default: module.OrderBhojanHomeTrustStrip,
  })),
);

function MockRestaurantFeed({ categoryId }: { categoryId: FoodCategoryId | null }) {
  return <HomeSpotlightMockFeed categoryId={categoryId} />;
}

function HomeLocationNudgeBanner({
  onSetLocation,
  onDismiss,
}: {
  readonly onSetLocation: () => void;
  readonly onDismiss: () => void;
}) {
  return (
    <div
      className="mx-4 mt-3 rounded-xl border border-[#e85d04]/25 bg-[#e85d04]/10 px-3.5 py-2.5 sm:mx-6"
      role="region"
      aria-label="Set delivery location"
    >
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#e85d04]" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold text-white">{DEFAULT_LOCATION_DISCOVERY_CTA}</p>
          <p className="text-xs text-white/60">Choose your area to see kitchens that deliver to you.</p>
          <button
            type="button"
            className="ob-press inline-flex min-h-9 items-center rounded-full bg-[#e85d04] px-3.5 text-xs font-bold uppercase tracking-wide text-[#fff8f0] touch-manipulation"
            onClick={onSetLocation}
          >
            Set location
          </button>
        </div>
        <button
          type="button"
          className="ob-press ob-touch-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 touch-manipulation"
          aria-label="Dismiss location reminder"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function readLocationNudgeDismissed(): boolean {
  try {
    return sessionStorage.getItem(LOCATION_NUDGE_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function HomeExperiencePage() {
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const discoveryQuery = useDiscoveryHome();
  const { openSelector } = useLocationActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedId } = useCategoryStore();
  const [locationNudgeDismissed, setLocationNudgeDismissed] = useState(readLocationNudgeDismissed);

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

  const discoverySettled = !discoveryQuery.isPending && !discoveryQuery.isFetching;
  const showLocationNudge =
    locationEnabled &&
    !hasActiveDeliveryLocation(activeLocation) &&
    !locationNudgeDismissed &&
    (!discoveryEnabled || discoverySettled);

  const dismissLocationNudge = () => {
    try {
      sessionStorage.setItem(LOCATION_NUDGE_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage failures; still hide for this session.
    }
    setLocationNudgeDismissed(true);
  };

  return (
    <div className="bg-[#050403] pb-5 text-[#fff8f0]">
      <OrderBhojanHomeHero />

      {locationEnabled && showLocationNudge ? (
        <HomeLocationNudgeBanner
          onSetLocation={() => openSelector()}
          onDismiss={dismissLocationNudge}
        />
      ) : null}

      {discoveryEnabled ? (
        <div className="px-4 pt-3.5 sm:px-6">
          <OrderBhojanHomeCategories compact />
        </div>
      ) : null}

      <p
        className="px-4 pt-2.5 text-[11px] leading-snug text-white/40 sm:px-6"
        data-testid="home-pricing-trust-banner"
      >
        ₹0 platform fee · Kitchen prices · No hidden charges
      </p>

      <div className="px-4 pt-2.5 sm:px-6">
        {discoveryEnabled ? (
          <DiscoveryHomeFeed />
        ) : (
          <MockRestaurantFeed categoryId={selectedId} />
        )}
      </div>

      <section className="mt-5 px-4 sm:px-6" aria-label="Why OrderBhojan">
        <Suspense fallback={<TrustStripFallback />}>
          <OrderBhojanHomeTrustStrip />
        </Suspense>
      </section>
    </div>
  );
}

function TrustStripFallback() {
  return <Skeleton className="h-[3.75rem] rounded-2xl ob-shimmer" aria-hidden="true" />;
}
