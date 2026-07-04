import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  Text,
} from '@bhojan/design-system';
import type { RestaurantPublic } from '@/types/marketplace';
import { useBlurUpImage } from '@/features/experience/hooks/useBlurUpImage';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';
import {
  cuisineLabel,
  formatDeliveryFee,
  formatDistance,
  formatEta,
  hasOffer,
  isCloudKitchen,
  isVegRestaurant,
} from '../utils/restaurantDisplay';

export interface DiscoveryRestaurantCardProps {
  readonly restaurant: RestaurantPublic;
  readonly width?: string;
}

export function DiscoveryRestaurantCard({
  restaurant,
  width = '17.5rem',
}: DiscoveryRestaurantCardProps) {
  const { isFavorite, toggle } = useFavoritesStore();
  const favorite = isFavorite(restaurant.restaurantId);
  const cover = useBlurUpImage();
  const coverUrl =
    restaurant.coverUrl ??
    'https://placehold.co/480x300/orange/white?text=Restaurant';

  return (
    <Card
      interactive
      className="bds-restaurant-card ob-restaurant-tile ob-discovery-card"
      style={{ width, minWidth: width }}
      aria-label={`${restaurant.displayName}, ${cuisineLabel(restaurant)}, rated ${restaurant.rating ?? '—'}`}
    >
      <div className="ob-restaurant-tile__media-wrap">
        <img
          src={coverUrl}
          alt=""
          className={`bds-restaurant-card__media ${cover.className}`}
          loading="lazy"
          decoding="async"
          onLoad={cover.onLoad}
        />
        <div className="ob-restaurant-tile__badges">
          {!restaurant.isOpen ? <Badge variant="status">Closed</Badge> : null}
          {hasOffer(restaurant) ? <Badge variant="offer">Offer</Badge> : null}
          {isCloudKitchen(restaurant) ? <Badge variant="cloudKitchen">Cloud</Badge> : null}
        </div>
        <Button
          variant="ghost"
          size="compact"
          className={`ob-restaurant-tile__favorite${favorite ? ' ob-restaurant-tile__favorite--active' : ''}`}
          aria-label={
            favorite
              ? `Remove ${restaurant.displayName} from favorites`
              : `Add ${restaurant.displayName} to favorites`
          }
          aria-pressed={favorite}
          onClick={(event) => {
            event.stopPropagation();
            toggle(restaurant.restaurantId);
          }}
        >
          <Icon size={18} label={favorite ? 'Favorited' : 'Favorite'}>
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </Icon>
        </Button>
      </div>
      <div className="bds-restaurant-card__body">
        <div className="ob-restaurant-tile__title-row">
          <Avatar src={restaurant.logoUrl} alt="" size="sm" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              variant="subtitle"
              as="div"
              style={{ lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              {restaurant.displayName}
            </Text>
            <Text
              variant="caption"
              style={{ color: 'var(--bds-color-text-secondary)', marginTop: '0.125rem' }}
            >
              {cuisineLabel(restaurant)}
            </Text>
          </div>
          <Badge variant={isVegRestaurant(restaurant) ? 'veg' : 'nonVeg'}>
            {isVegRestaurant(restaurant) ? 'Veg' : 'Non-Veg'}
          </Badge>
        </div>
        <div style={{ display: 'flex', gap: 'var(--bds-space-2)', flexWrap: 'wrap' }}>
          {restaurant.rating != null ? (
            <Badge variant="rating">★ {restaurant.rating.toFixed(1)}</Badge>
          ) : null}
          <Badge variant="delivery">{formatEta(restaurant)}</Badge>
          <Badge variant="delivery">{formatDeliveryFee(restaurant)}</Badge>
          <Badge variant="default">{formatDistance(restaurant)}</Badge>
        </div>
      </div>
    </Card>
  );
}
