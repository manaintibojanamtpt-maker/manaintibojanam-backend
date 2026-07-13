import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { MarketplaceKitchenCardView } from '@bhojan/storefront-design-system/marketplace/MarketplaceKitchenCard';
import type { RestaurantPublic } from '@/types/marketplace';
import { useRestaurantFeatureEnabled } from '@/features/restaurant';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';
import { mapRestaurantPublicToKitchenCard } from './mapRestaurantToKitchenCard';

export interface OrderBhojanKitchenCardProps {
  readonly restaurant: RestaurantPublic;
  readonly variant?: 'default' | 'spotlight';
  readonly width?: string;
  readonly className?: string;
  readonly imageLoading?: 'lazy' | 'eager';
}

export function OrderBhojanKitchenCard({
  restaurant,
  variant = 'default',
  width = '17.5rem',
  className = '',
  imageLoading = 'lazy',
}: OrderBhojanKitchenCardProps) {
  const restaurantEnabled = useRestaurantFeatureEnabled();
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggle = useFavoritesStore((s) => s.toggle);
  const favorite = isFavorite(restaurant.restaurantId);

  const kitchen = useMemo(() => mapRestaurantPublicToKitchenCard(restaurant), [restaurant]);
  const isGridCard = className.includes('lg:w-full');

  const favoriteSlot = (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition hover:border-[#FF7A00]/40 ${
        favorite ? 'text-[#FF7A00]' : 'text-white/70'
      }`}
      aria-label={
        favorite
          ? `Remove ${restaurant.displayName} from favorites`
          : `Add ${restaurant.displayName} to favorites`
      }
      aria-pressed={favorite}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(restaurant.restaurantId);
      }}
    >
      <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
    </button>
  );

  return (
    <div
      className={`shrink-0 ${restaurantEnabled ? '' : 'pointer-events-none opacity-60'} ${
        variant === 'default' && !isGridCard ? '' : 'min-w-0'
      } ${className}`}
      style={variant === 'default' && !isGridCard ? { width, minWidth: width } : undefined}
      aria-label={`${restaurant.displayName}, rated ${restaurant.rating ?? '—'}`}
    >
      <MarketplaceKitchenCardView
        kitchen={kitchen}
        variant={variant}
        favoriteSlot={favoriteSlot}
        imageLoading={imageLoading}
        className={variant === 'spotlight' ? 'h-full' : 'h-full'}
        spotlightEyebrow="Cooking now"
      />
    </div>
  );
}
