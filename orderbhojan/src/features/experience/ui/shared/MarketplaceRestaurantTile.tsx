import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  Text,
} from '@bhojan/design-system';
import type { MockRestaurant } from '../../domain/experience.types';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useBlurUpImage } from '../../hooks/useBlurUpImage';

export interface MarketplaceRestaurantTileProps {
  readonly restaurant: MockRestaurant;
  readonly width?: string;
  readonly onSelect?: () => void;
}

export function MarketplaceRestaurantTile({
  restaurant,
  width = '17.5rem',
  onSelect,
}: MarketplaceRestaurantTileProps) {
  const { isFavorite, toggle } = useFavoritesStore();
  const favorite = isFavorite(restaurant.id);
  const cover = useBlurUpImage();

  return (
    <Card
      interactive
      className="bds-restaurant-card ob-restaurant-tile"
      style={{ width, minWidth: width }}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-label={`${restaurant.name}, ${restaurant.cuisine}, rated ${restaurant.rating}`}
    >
      <div className="ob-restaurant-tile__media-wrap">
        <img
          src={restaurant.imageUrl}
          alt=""
          className={`bds-restaurant-card__media ${cover.className}`}
          loading="lazy"
          decoding="async"
          onLoad={cover.onLoad}
        />
        <div className="ob-restaurant-tile__badges">
          {!restaurant.isOpen ? <Badge variant="status">Closed</Badge> : null}
          {restaurant.offer ? <Badge variant="offer">{restaurant.offer}</Badge> : null}
          {restaurant.isCloudKitchen ? <Badge variant="cloudKitchen">Cloud</Badge> : null}
        </div>
        <Button
          variant="ghost"
          size="compact"
          className={`ob-restaurant-tile__favorite${favorite ? ' ob-restaurant-tile__favorite--active' : ''}`}
          aria-label={favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
          aria-pressed={favorite}
          onClick={(event) => {
            event.stopPropagation();
            toggle(restaurant.id);
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
            <Text variant="subtitle" as="div" style={{ lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {restaurant.name}
            </Text>
            <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)', marginTop: '0.125rem' }}>
              {restaurant.cuisine}
            </Text>
          </div>
          <Badge variant={restaurant.isVeg ? 'veg' : 'nonVeg'}>{restaurant.isVeg ? 'Veg' : 'Non-Veg'}</Badge>
        </div>
        <div style={{ display: 'flex', gap: 'var(--bds-space-2)', flexWrap: 'wrap' }}>
          <Badge variant="rating">★ {restaurant.rating.toFixed(1)}</Badge>
          <Badge variant="delivery">{restaurant.eta}</Badge>
          <Badge variant="delivery">{restaurant.deliveryFee}</Badge>
          <Badge variant="default">{restaurant.distance}</Badge>
        </div>
      </div>
    </Card>
  );
}
