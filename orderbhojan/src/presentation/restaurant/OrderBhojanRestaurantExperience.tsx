import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { useFoodFeatureEnabled } from '@/features/food/hooks/useFoodFeature';
import {
  pictureSources,
  resolveRestaurantCover,
  resolveRestaurantLogo,
  restaurantSlugFromString,
} from '@/features/restaurant/data/restaurant-photo-manifest';
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

function OrderBhojanRestaurantContent({ data }: { data: RestaurantExperienceResponse }) {
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
      <div style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}>
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
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#030303]/95 p-4 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SoftButton
          type="button"
          className="w-full"
          disabled={!menuEnabled || experience.openStatus === 'closed'}
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
  useTenantRevisionSync(restaurantSlug);
  const online = useOnlineStatus();
  const query = useRestaurantExperience(restaurantSlug);

  if (query.isLoading) {
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

  return <OrderBhojanRestaurantContent data={query.data} />;
}
