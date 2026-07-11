import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
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
    <div
      className="bds-card bds-card--interactive bds-restaurant-card bds-restaurant-card--immersive ob-restaurant-tile"
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
          {!restaurant.isOpen ? <span className="bds-badge">Closed</span> : null}
          {!compactHome && restaurant.offer ? (
            <span className="bds-badge bds-badge--offer">{restaurant.offer}</span>
          ) : null}
          {!compactHome && restaurant.isCloudKitchen ? (
            <span className="bds-badge bds-badge--offer">Cloud</span>
          ) : null}
        </div>
        {!compactHome ? (
          <button
            type="button"
            className={`bds-btn bds-btn--ghost bds-btn--compact ob-restaurant-tile__favorite${favorite ? ' ob-restaurant-tile__favorite--active' : ''}`}
            aria-label={favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
            aria-pressed={favorite}
            onClick={(event) => {
              event.stopPropagation();
              toggleFavorite(restaurant.id);
            }}
          >
            <Heart className="h-[18px] w-[18px]" fill={favorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="bds-restaurant-card__body">
        <div className="ob-restaurant-tile__title-row">
          {!compactHome ? (
            <div className="bds-avatar bds-avatar--sm" role="img" aria-label="">
              {restaurant.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : null}
            </div>
          ) : null}
          <div className="ob-restaurant-tile__title-copy">
            <div className="bds-text-subtitle ob-restaurant-tile__name">
              {restaurant.name}
            </div>
            <div className="bds-text-caption ob-restaurant-tile__cuisine">
              {restaurant.cuisine}
            </div>
          </div>
          {!compactHome ? (
            <span className={`bds-badge ${restaurant.isVeg ? 'bds-badge--veg' : 'bds-badge--non-veg'}`}>
              {restaurant.isVeg ? 'Veg' : 'Non-Veg'}
            </span>
          ) : null}
        </div>
        <div className="ob-restaurant-tile__meta">
          <span className="bds-badge bds-badge--rating">★ {restaurant.rating.toFixed(1)}</span>
          <span className="bds-badge bds-badge--delivery">{restaurant.eta}</span>
          {!compactHome ? (
            <>
              <span className="bds-badge bds-badge--delivery">{restaurant.deliveryFee}</span>
              <span className="bds-badge">{restaurant.distance}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
