import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { useFoodFeatureEnabled } from '@/features/food/hooks/useFoodFeature';
import { loadFoodMenu } from '@/features/food/engine/foodExperienceLayer';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import {
  pictureSources,
  resolveRestaurantCover,
  resolveRestaurantLogo,
  restaurantSlugFromString,
} from '@/features/restaurant/data/restaurant-photo-manifest';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { useRestaurantScrollChrome } from '@/features/restaurant/hooks/useRestaurantScrollChrome';
import { useRestaurantExperience } from '@/features/restaurant/hooks/useRestaurantExperience';
import { useTenantRevisionSync } from '@/features/marketplace/hooks/useTenantRevisionSync';
import { formatOpenStatusLabel } from '@/features/restaurant/domain/formatters';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanRestaurantClosedBanner,
  OrderBhojanRestaurantErrorState,
  OrderBhojanRestaurantUxShell,
  useOnlineStatus,
} from '@/presentation/states';
import { OrderBhojanRestaurantSkeleton } from './OrderBhojanRestaurantSkeleton';
import { OrderBhojanRestaurantHero } from './OrderBhojanRestaurantHero';
import { OrderBhojanRestaurantInfoSections } from './OrderBhojanRestaurantInfoSections';
import { OrderBhojanRestaurantStickyHeader } from './OrderBhojanRestaurantActions';
import type { RestaurantExperienceResponse } from '@/types/marketplace-restaurant';

function OrderBhojanRestaurantContent({
  data,
  onPrefetchMenu,
}: {
  data: RestaurantExperienceResponse;
  onPrefetchMenu: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuEnabled = useFoodFeatureEnabled();
  const collapsed = useRestaurantScrollChrome();
  const { experience } = data;
  const slug = restaurantSlugFromString(experience.slug);
  const liveFirestore = isFeatureEnabled(loadFeatureFlags(), 'FF_OB_FIRESTORE');
  const manifestCover = resolveRestaurantCover(slug, 88);
  const manifestLogo = resolveRestaurantLogo(slug, 82);
  const hasOwnerCover = Boolean(experience.coverImage);
  const coverSrc = hasOwnerCover
    ? experience.coverImage
    : liveFirestore
      ? undefined
      : manifestCover.src;
  const logoSrc = experience.logo || manifestLogo.src;
  const enterFromPoster = Boolean((location.state as { fromPoster?: boolean } | null)?.fromPoster);

  return (
    <div className="min-h-screen bg-[#030303] pb-28 text-white">
      <OrderBhojanRestaurantStickyHeader name={experience.displayName} />
      <div style={{ paddingTop: 'calc(3.5rem + var(--ob-safe-top))' }}>
      <OrderBhojanRestaurantHero
        data={data}
        collapsed={collapsed}
        enterFromPoster={enterFromPoster}
        coverSrc={coverSrc}
        coverSrcSet={hasOwnerCover || liveFirestore ? undefined : manifestCover.webpSrcSet}
        coverSizes="100vw"
        coverBlurDataURL={hasOwnerCover || liveFirestore ? undefined : manifestCover.blurDataURL}
        coverSources={hasOwnerCover || liveFirestore ? undefined : pictureSources(manifestCover, '100vw')}
        logoSrc={logoSrc}
      />
      </div>
      <OrderBhojanRestaurantInfoSections data={data} />

      {experience.openStatus === 'closed' ? (
        <OrderBhojanRestaurantClosedBanner
          label={formatOpenStatusLabel(experience.openStatus)}
          onBrowse={() => navigate('/')}
        />
      ) : null}

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#030303]/95 backdrop-blur-md ob-menu-container pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
      >
        <SoftButton
          type="button"
          className="w-full"
          disabled={!menuEnabled || experience.openStatus === 'closed'}
          onPointerDown={onPrefetchMenu}
          onFocus={onPrefetchMenu}
          onClick={() =>
            navigate(`/restaurant/${experience.slug}/menu`, { state: { fromRestaurant: true } })
          }
        >
          Open Menu
        </SoftButton>
        {experience.openStatus === 'closed' ? (
          <SoftButton type="button" tone="ghost" className="mt-2 w-full" onClick={() => navigate('/')}>
            Browse other kitchens
          </SoftButton>
        ) : null}
      </div>
    </div>
  );
}

export function OrderBhojanRestaurantExperience() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const liveQuery = getMarketplaceQueryBehavior();
  useTenantRevisionSync(restaurantSlug);
  const online = useOnlineStatus();
  const query = useRestaurantExperience(restaurantSlug);

  const prefetchMenu = useCallback(() => {
    if (!restaurantSlug) return;
    const coords = resolveRestaurantCoords(activeLocation);
    void queryClient.prefetchQuery({
      queryKey: foodKeys.menu(restaurantSlug, coords.lat, coords.lng),
      queryFn: () =>
        loadFoodMenu({
          slug: restaurantSlug,
          lat: coords.lat,
          lng: coords.lng,
        }),
      staleTime: liveQuery.staleTime,
    });
    void import('@/features/food/ui/FoodRoutePage');
  }, [activeLocation, liveQuery.staleTime, queryClient, restaurantSlug]);

  useEffect(() => {
    if (!query.data || !restaurantSlug) return;
    prefetchMenu();
  }, [prefetchMenu, query.data, restaurantSlug]);

  if (query.isPending && !query.data) {
    return <OrderBhojanRestaurantSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <OrderBhojanRestaurantUxShell>
        {!online ? <OrderBhojanDiscoveryOfflineNotice onRetry={() => void query.refetch()} /> : null}
        <OrderBhojanRestaurantErrorState
          offline={!online}
          onRetry={() => void query.refetch()}
        />
      </OrderBhojanRestaurantUxShell>
    );
  }

  return <OrderBhojanRestaurantContent data={query.data} onPrefetchMenu={prefetchMenu} />;
}
