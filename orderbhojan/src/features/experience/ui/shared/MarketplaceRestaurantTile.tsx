import { useNavigate } from 'react-router-dom';
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
import { useFavoriteToggle } from '@/features/favorites/hooks/useFavoritesSync';
import { useBlurUpImage } from '../../hooks/useBlurUpImage';

export interface MarketplaceRestaurantTileProps {
  readonly restaurant: MockRestaurant;
  readonly width?: string;
  readonly compactHome?: boolean;
  readonly onSelect?: () => void;
}

export function MarketplaceRestaurantTile({
  restaurant,
  width = '17.5rem',
  compactHome = false,
  onSelect,
}: MarketplaceRestaurantTileProps) {
  const navigate = useNavigate();
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoriteToggle();
  const favorite = isFavorite(restaurant.id);
  const cover = useBlurUpImage();

  const handleNavigate = () => {
    if (onSelect) {
      onSelect();
    } else {
      navigate(`/restaurant/${restaurant.slug}`);
    }
  };

  return (
    <Card
      interactive
      className="bds-restaurant-card bds-restaurant-card--immersive ob-restaurant-tile"
      style={{ width, minWidth: width }}
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleNavigate();
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
          {!compactHome && restaurant.offer ? <Badge variant="offer">{restaurant.offer}</Badge> : null}
          {!compactHome && restaurant.isCloudKitchen ? <Badge variant="cloudKitchen">Cloud</Badge> : null}
        </div>
        {!compactHome ? (
          <Button
            variant="ghost"
            size="compact"
            className={`ob-restaurant-tile__favorite${favorite ? ' ob-restaurant-tile__favorite--active' : ''}`}
            aria-label={favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
            aria-pressed={favorite}
            onClick={(event) => {
              event.stopPropagation();
              toggleFavorite(restaurant.id);
            }}
          >
            <Icon size={18} label={favorite ? 'Favorited' : 'Favorite'}>
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </Icon>
          </Button>
        ) : null}
      </div>
      <div className="bds-restaurant-card__body">
        <div className="ob-restaurant-tile__title-row">
          {!compactHome ? <Avatar src={restaurant.logoUrl} alt="" size="sm" /> : null}
          <div className="ob-restaurant-tile__title-copy">
            <Text variant="subtitle" as="div" className="ob-restaurant-tile__name">
              {restaurant.name}
            </Text>
            <Text variant="caption" className="ob-restaurant-tile__cuisine">
              {restaurant.cuisine}
            </Text>
          </div>
          {!compactHome ? (
            <Badge variant={restaurant.isVeg ? 'veg' : 'nonVeg'}>{restaurant.isVeg ? 'Veg' : 'Non-Veg'}</Badge>
          ) : null}
        </div>
        <div className="ob-restaurant-tile__meta">
          <Badge variant="rating">★ {restaurant.rating.toFixed(1)}</Badge>
          <Badge variant="delivery">{restaurant.eta}</Badge>
          {!compactHome ? (
            <>
              <Badge variant="delivery">{restaurant.deliveryFee}</Badge>
              <Badge variant="default">{restaurant.distance}</Badge>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
