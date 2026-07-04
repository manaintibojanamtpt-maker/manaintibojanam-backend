import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  Rail,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useBlurUpImage } from '@/features/experience/hooks/useBlurUpImage';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';
import { useScrollChrome } from '@/features/experience/hooks/useScrollChrome';
import { useRestaurantExperience } from '../hooks/useRestaurantExperience';
import {
  cuisineHeadline,
  formatDeliveryFeeLabel,
  formatDistanceLabel,
  formatEtaLabel,
  formatOpenStatusLabel,
} from '../domain/formatters';
import type { RestaurantExperienceResponse } from '@/types/marketplace-restaurant';

function RestaurantExperienceSkeleton() {
  return (
    <div className="ob-restaurant-page ob-restaurant-page--loading" aria-busy="true">
      <Skeleton height="clamp(14rem, 42vw, 22rem)" />
      <div className="ob-restaurant-page__body">
        <Skeleton width="5rem" height="5rem" />
        <Skeleton height="1.5rem" width="70%" />
        <Skeleton height="1rem" width="50%" />
        <Skeleton height="6rem" />
      </div>
    </div>
  );
}

function ShareButton({ title, text }: { title: string; text: string }) {
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <Button variant="secondary" size="compact" aria-label="Share restaurant" onClick={() => void share()}>
      <Icon size={18} label="Share">
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v13" />
      </Icon>
      Share
    </Button>
  );
}

function FavoriteButton({ restaurantId, name }: { restaurantId: string; name: string }) {
  const { isFavorite, toggle } = useFavoritesStore();
  const favorite = isFavorite(restaurantId);
  const [burst, setBurst] = useState(false);

  return (
    <Button
      variant="secondary"
      size="compact"
      className={burst ? 'ob-restaurant-favorite--burst' : undefined}
      aria-label={favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      aria-pressed={favorite}
      onClick={() => {
        toggle(restaurantId);
        setBurst(true);
        window.setTimeout(() => setBurst(false), 420);
      }}
    >
      <Icon size={18} label={favorite ? 'Favorited' : 'Favorite'}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </Icon>
      {favorite ? 'Saved' : 'Favorite'}
    </Button>
  );
}

function RestaurantContent({ data }: { data: RestaurantExperienceResponse }) {
  const navigate = useNavigate();
  const collapsed = useScrollChrome(160);
  const cover = useBlurUpImage();
  const { experience, hours, serviceability, policies, highlights } = data;
  const coverUrl =
    experience.coverImage ??
    'https://placehold.co/1200x600/orange/white?text=Restaurant';

  return (
    <div className="ob-restaurant-page ob-page-enter">
      <header
        className={`ob-restaurant-page__header${collapsed ? ' ob-restaurant-page__header--collapsed' : ''}`}
      >
        <Button
          variant="ghost"
          size="compact"
          className="ob-restaurant-page__back"
          aria-label="Go back"
          onClick={() => navigate(-1)}
        >
          <Icon size={20} label="Back">
            <path d="M15 18l-6-6 6-6" />
          </Icon>
        </Button>
        {collapsed ? (
          <Text variant="subtitle" className="ob-restaurant-page__header-title">
            {experience.displayName}
          </Text>
        ) : null}
      </header>

      <div className="ob-restaurant-page__hero">
        <img
          src={coverUrl}
          alt=""
          className={`ob-restaurant-page__cover ${cover.className}`}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={cover.onLoad}
        />
        <div className="ob-restaurant-page__hero-overlay" aria-hidden />
      </div>

      <div className="ob-restaurant-page__identity">
        <Avatar src={experience.logo} alt="" size="lg" className="ob-restaurant-page__logo" />
        <div className="ob-restaurant-page__title-block">
          <Text variant="heading" as="h1" className="ob-restaurant-page__name">
            {experience.displayName}
          </Text>
          <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
            {cuisineHeadline(experience.cuisines)}
          </Text>
          <div className="ob-restaurant-page__meta">
            {experience.rating != null ? (
              <Badge variant="rating">★ {experience.rating.toFixed(1)} ({experience.ratingCount ?? 0})</Badge>
            ) : null}
            <Badge variant="delivery">{formatEtaLabel(experience.eta)}</Badge>
            <Badge variant="default">{formatDistanceLabel(experience.distance)}</Badge>
            <Badge variant="delivery">{formatDeliveryFeeLabel(experience.deliveryFee)}</Badge>
            {experience.priceRange ? <Badge variant="default">{experience.priceRange}</Badge> : null}
            {experience.cloudKitchen ? <Badge variant="cloudKitchen">Cloud Kitchen</Badge> : null}
            {experience.veg ? <Badge variant="veg">Veg</Badge> : null}
            <Badge variant={experience.openStatus === 'open' ? 'delivery' : 'status'}>
              {formatOpenStatusLabel(experience.openStatus)}
            </Badge>
          </div>
          {experience.todayHours ? (
            <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
              Today: {experience.todayHours}
            </Text>
          ) : null}
        </div>
      </div>

      {experience.offers.length > 0 ? (
        <section className="ob-restaurant-section" aria-label="Offers">
          <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
            Offers
          </Text>
          <Rail>
            {experience.offers.map((offer) => (
              <Card key={offer.id} className="ob-restaurant-offer-card">
                {offer.badge ? <Badge variant="offer">{offer.badge}</Badge> : null}
                <Text variant="bodySm" style={{ fontWeight: 700 }}>{offer.title}</Text>
                {offer.description ? (
                  <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
                    {offer.description}
                  </Text>
                ) : null}
              </Card>
            ))}
          </Rail>
        </section>
      ) : null}

      <section className="ob-restaurant-section ob-restaurant-quick-actions" aria-label="Quick actions">
        <ShareButton title={experience.displayName} text={cuisineHeadline(experience.cuisines)} />
        <FavoriteButton restaurantId={experience.restaurantId} name={experience.displayName} />
        <Button variant="secondary" size="compact" disabled aria-label="Call restaurant coming soon">
          Call
        </Button>
        <Button variant="secondary" size="compact" disabled aria-label="Directions coming soon">
          Direction
        </Button>
      </section>

      {experience.description ? (
        <section className="ob-restaurant-section" aria-label="About restaurant">
          <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
            About
          </Text>
          <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)', lineHeight: 1.6 }}>
            {experience.description}
          </Text>
        </section>
      ) : null}

      <section className="ob-restaurant-section" aria-label="Operating hours">
        <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
          Operating Hours
        </Text>
        <div className="ob-restaurant-hours">
          {hours.map((row) => (
            <div key={row.day} className="ob-restaurant-hours__row">
              <Text variant="bodySm" style={{ fontWeight: row.isToday ? 700 : 500 }}>{row.day}</Text>
              <Text variant="bodySm">{row.open} – {row.close}</Text>
            </div>
          ))}
        </div>
      </section>

      <section className="ob-restaurant-section" aria-label="Serviceability">
        <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
          Serviceability
        </Text>
        <div className="ob-restaurant-page__meta">
          <Badge variant={serviceability.delivery ? 'delivery' : 'status'}>
            Delivery {serviceability.delivery ? 'available' : 'unavailable'}
          </Badge>
          <Badge variant={serviceability.pickup ? 'delivery' : 'status'}>
            Pickup {serviceability.pickup ? 'available' : 'unavailable'}
          </Badge>
        </div>
        {serviceability.message ? (
          <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            {serviceability.message}
          </Text>
        ) : null}
      </section>

      {experience.gallery.length > 0 ? (
        <section className="ob-restaurant-section" aria-label="Photo gallery">
          <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
            Gallery
          </Text>
          <Rail className="ob-restaurant-gallery">
            {experience.gallery.map((image) => (
              <figure key={image.id} className="ob-restaurant-gallery__item">
                <img src={image.url} alt={image.caption ?? ''} loading="lazy" decoding="async" />
                {image.caption ? (
                  <Text variant="caption" as="figcaption">{image.caption}</Text>
                ) : null}
              </figure>
            ))}
          </Rail>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className="ob-restaurant-section" aria-label="Highlights">
          <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
            Highlights
          </Text>
          <div className="ob-restaurant-highlights">
            {highlights.map((item) => (
              <Card key={item.id} className="ob-restaurant-highlight-card">
                <Text variant="bodySm" style={{ fontWeight: 700 }}>{item.title}</Text>
                {item.subtitle ? (
                  <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {policies.length > 0 ? (
        <section className="ob-restaurant-section" aria-label="Policies">
          <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
            Policies
          </Text>
          {policies.map((policy) => (
            <div key={policy.id} className="ob-restaurant-policy">
              <Text variant="bodySm" style={{ fontWeight: 700 }}>{policy.title}</Text>
              <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
                {policy.body}
              </Text>
            </div>
          ))}
        </section>
      ) : null}

      <section className="ob-restaurant-section" aria-label="Customer reviews">
        <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
          Customer Reviews
        </Text>
        <Card className="ob-restaurant-placeholder">
          <Text variant="bodySm" style={{ fontWeight: 700 }}>Reviews coming soon</Text>
          <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            Verified ratings and reviews will appear here in a future release.
          </Text>
        </Card>
      </section>

      <section className="ob-restaurant-section" aria-label="Recommended preview">
        <Text variant="subtitle" as="h2" className="ob-restaurant-section__title">
          Recommended for you
        </Text>
        <Card className="ob-restaurant-placeholder">
          <Text variant="bodySm" style={{ fontWeight: 700 }}>Personalized picks coming soon</Text>
          <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            AI-powered recommendations will preview here.
          </Text>
        </Card>
      </section>

      <div className="ob-restaurant-page__sticky-spacer" aria-hidden />

      <footer className="ob-restaurant-page__sticky-bar">
        <Button
          variant="primary"
          className="ob-restaurant-page__menu-cta"
          disabled
          aria-label="Open menu coming in M6"
        >
          Open Menu
        </Button>
      </footer>
    </div>
  );
}

export function RestaurantExperiencePage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const query = useRestaurantExperience(restaurantSlug);

  if (query.isLoading) {
    return <RestaurantExperienceSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <section className="ob-restaurant-page ob-restaurant-page--error" role="alert">
        <Text variant="subtitle" as="h1">Restaurant unavailable</Text>
        <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
          We could not load this restaurant. Check your connection and try again.
        </Text>
        <Button variant="primary" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  return <RestaurantContent data={query.data} />;
}
