import {
  Badge,
  FloatingCTA,
  GlassSurface,
  MotionPage,
  MotionReveal,
  PremiumEmpty,
  RestaurantHero,
  Skeleton,
  Text,
  TrustVerifiedIcon,
} from '@bhojan/design-system';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFoodFeatureEnabled } from '@/features/food/hooks/useFoodFeature';
import { useHeroPreload } from '@/features/experience/hooks/useHeroPreload';
import {
  pictureSources,
  resolveRestaurantCover,
  resolveRestaurantLogo,
  restaurantSlugFromString,
} from '../data/restaurant-photo-manifest';
import {
  cuisineHeadline,
  formatDeliveryFeeLabel,
  formatDistanceLabel,
  formatEtaLabel,
  formatOpenStatusLabel,
  kitchenDietaryLabel,
} from '../domain/formatters';
import { useRestaurantScrollChrome } from '../hooks/useRestaurantScrollChrome';
import { useRestaurantExperience } from '../hooks/useRestaurantExperience';
import { useTenantRevisionSync } from '@/features/marketplace/hooks/useTenantRevisionSync';
import type { RestaurantExperienceResponse } from '@/types/marketplace-restaurant';
import { RestaurantGalleryRail } from './RestaurantGalleryRail';
import { RestaurantGlassActions, RestaurantStickyHeader } from './RestaurantGlassActions';

function RestaurantExperienceSkeleton() {
  return (
    <div className="ob-restaurant-px5 ob-restaurant-px5--loading" aria-busy="true">
      <Skeleton height="46vh" />
      <div className="ob-restaurant-px5__body">
        <Skeleton width="5rem" height="5rem" />
        <Skeleton height="1.5rem" width="70%" />
        <Skeleton height="1rem" width="50%" />
        <Skeleton height="8rem" />
      </div>
    </div>
  );
}

function RestaurantMetaRow({ data }: { data: RestaurantExperienceResponse }) {
  const { experience } = data;
  const dietaryLabel = kitchenDietaryLabel(experience.kitchenDietary);
  return (
    <div className="ob-restaurant-px5__meta">
      <Text variant="bodySm" className="ob-restaurant-px5__cuisine">
        {cuisineHeadline(experience.cuisines)}
      </Text>
      <div className="ob-restaurant-px5__stats">
        {dietaryLabel ? (
          <Badge variant={experience.kitchenDietary === 'pure_veg' ? 'veg' : 'nonVeg'}>
            {dietaryLabel}
          </Badge>
        ) : null}
        {experience.rating != null ? (
          <Badge variant="rating">★ {experience.rating.toFixed(1)}</Badge>
        ) : null}
        {experience.eta ? (
          <Badge variant="delivery">{formatEtaLabel(experience.eta)}</Badge>
        ) : null}
        {experience.distance != null ? (
          <Badge variant="default">{formatDistanceLabel(experience.distance)}</Badge>
        ) : null}
        {experience.deliveryFeeKnown !== false ? (
          <Badge variant="delivery">
            {formatDeliveryFeeLabel(experience.deliveryFee, {
              known: experience.deliveryFeeKnown,
            })}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function RestaurantContent({ data }: { data: RestaurantExperienceResponse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuEnabled = useFoodFeatureEnabled();
  const collapsed = useRestaurantScrollChrome();
  const { experience, hours, highlights, policies } = data;
  const slug = restaurantSlugFromString(experience.slug);
  const manifestCover = resolveRestaurantCover(slug, 88);
  const manifestLogo = resolveRestaurantLogo(slug, 82);
  const coverSrc = experience.coverImage || manifestCover.src;
  const logoSrc = experience.logo || manifestLogo.src;
  const enterFromPoster = Boolean((location.state as { fromPoster?: boolean } | null)?.fromPoster);
  const primaryOffer = experience.offers[0];

  useHeroPreload(coverSrc, manifestCover.webpSrcSet);

  return (
    <MotionPage className="ob-restaurant-px5">
      <RestaurantStickyHeader name={experience.displayName} visible={collapsed} />

      <RestaurantHero
        variant="immersive"
        collapsed={collapsed}
        enterFromPoster={enterFromPoster}
        coverUrl={coverSrc}
        coverSrcSet={experience.coverImage ? undefined : manifestCover.webpSrcSet}
        coverSizes="100vw"
        coverBlurDataURL={experience.coverImage ? undefined : manifestCover.blurDataURL}
        coverSources={experience.coverImage ? undefined : pictureSources(manifestCover, '100vw')}
        coverPriority
        coverAlt={`${experience.displayName} — cover`}
        logoUrl={logoSrc}
        name={experience.displayName}
        actionsSlot={
          <RestaurantGlassActions
            restaurantId={experience.restaurantId}
            name={experience.displayName}
            shareText={cuisineHeadline(experience.cuisines)}
          />
        }
        offerSlot={
          primaryOffer ? (
            <Badge variant="offer">{primaryOffer.badge ?? primaryOffer.title}</Badge>
          ) : null
        }
        statusSlot={
          <>
            <Badge variant={experience.openStatus === 'open' ? 'delivery' : 'status'}>
              {formatOpenStatusLabel(experience.openStatus)}
            </Badge>
            {experience.cloudKitchen ? (
              <Badge variant="cloudKitchen" className="ob-restaurant-px5__verified">
                <span>Cloud kitchen</span>
              </Badge>
            ) : (
              <Badge variant="default" className="ob-restaurant-px5__verified">
                <TrustVerifiedIcon />
                <span>Verified kitchen</span>
              </Badge>
            )}
          </>
        }
        meta={<RestaurantMetaRow data={data} />}
      />

      <div className="ob-restaurant-px5__body">
        {experience.description ? (
          <MotionReveal delay={0.04}>
            <section className="ob-restaurant-px5__section" aria-label="About restaurant">
              <Text variant="titleSm" as="h2" className="ob-restaurant-px5__section-title">
                About
              </Text>
              <Text variant="body" className="ob-restaurant-px5__about">
                {experience.description}
              </Text>
            </section>
          </MotionReveal>
        ) : null}

        {experience.gallery.length > 0 ? (
          <MotionReveal delay={0.06}>
            <section className="ob-restaurant-px5__section" aria-label="Photo gallery">
              <Text variant="titleSm" as="h2" className="ob-restaurant-px5__section-title">
                Gallery
              </Text>
              <RestaurantGalleryRail images={experience.gallery} />
            </section>
          </MotionReveal>
        ) : null}

        {highlights.length > 0 ? (
          <MotionReveal delay={0.08}>
            <section className="ob-restaurant-px5__section" aria-label="Highlights">
              <Text variant="titleSm" as="h2" className="ob-restaurant-px5__section-title">
                Highlights
              </Text>
              <div className="ob-restaurant-px5__highlights">
                {highlights.map((item) => (
                  <GlassSurface key={item.id} className="ob-restaurant-px5__highlight">
                    <Text variant="bodySm" style={{ fontWeight: 700 }}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text variant="caption" className="ob-restaurant-px5__highlight-sub">
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </GlassSurface>
                ))}
              </div>
            </section>
          </MotionReveal>
        ) : null}

        <MotionReveal delay={0.1}>
          <section className="ob-restaurant-px5__section" aria-label="Operating hours">
            <Text variant="titleSm" as="h2" className="ob-restaurant-px5__section-title">
              Hours
            </Text>
            <div className="ob-restaurant-px5__hours">
              {hours.map((row) => (
                <div key={row.day} className="ob-restaurant-px5__hours-row">
                  <Text variant="bodySm" style={{ fontWeight: row.isToday ? 700 : 500 }}>{row.day}</Text>
                  <Text variant="bodySm">{row.open} – {row.close}</Text>
                </div>
              ))}
            </div>
          </section>
        </MotionReveal>

        {policies.length > 0 ? (
          <section className="ob-restaurant-px5__section ob-restaurant-px5__section--foot" aria-label="Policies">
            {policies.map((policy) => (
              <div key={policy.id} className="ob-restaurant-px5__policy">
                <Text variant="caption" style={{ fontWeight: 700 }}>{policy.title}</Text>
                <Text variant="caption" className="ob-restaurant-px5__policy-body">{policy.body}</Text>
              </div>
            ))}
          </section>
        ) : null}
      </div>

      <FloatingCTA
        className={`ob-restaurant-px5__menu-cta${collapsed ? ' ob-restaurant-px5__menu-cta--raised' : ''}`}
        label="Open Menu"
        disabled={!menuEnabled || experience.openStatus === 'closed'}
        onClick={() =>
          navigate(`/restaurant/${experience.slug}/menu`, { state: { fromRestaurant: true } })
        }
      />
    </MotionPage>
  );
}

export function RestaurantExperiencePage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  useTenantRevisionSync(restaurantSlug);
  const query = useRestaurantExperience(restaurantSlug);

  if (query.isLoading) {
    return <RestaurantExperienceSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <section className="ob-restaurant-px5 ob-restaurant-px5--error">
        <PremiumEmpty
          title="Restaurant unavailable"
          description="We could not load this restaurant. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      </section>
    );
  }

  return <RestaurantContent data={query.data} />;
}
