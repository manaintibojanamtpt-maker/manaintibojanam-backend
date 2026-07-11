import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { MarketplaceKitchenCardView } from '@bhojan/storefront-design-system/marketplace/MarketplaceKitchenCard';
import type { MockRestaurant } from '@/features/experience/domain/experience.types';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';
import { useRestaurantFeatureEnabled } from '@/features/restaurant';
import { mapMockRestaurantToKitchenCard } from './mapRestaurantToKitchenCard';

export interface OrderBhojanMockKitchenCardProps {
  readonly restaurant: MockRestaurant;
  readonly variant?: 'default' | 'spotlight';
  readonly width?: string;
  readonly className?: string;
}

export function OrderBhojanMockKitchenCard({
  restaurant,
  variant = 'default',
  width = '17.5rem',
  className = '',
}: OrderBhojanMockKitchenCardProps) {
  const restaurantEnabled = useRestaurantFeatureEnabled();
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggle = useFavoritesStore((s) => s.toggle);
  const favorite = isFavorite(restaurant.id);

  const kitchen = useMemo(() => mapMockRestaurantToKitchenCard(restaurant), [restaurant]);

  const favoriteSlot = (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition hover:border-[#FF7A00]/40 ${
        favorite ? 'text-[#FF7A00]' : 'text-white/70'
      }`}
      aria-label={
        favorite
          ? `Remove ${restaurant.name} from favorites`
          : `Add ${restaurant.name} to favorites`
      }
      aria-pressed={favorite}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(restaurant.id);
      }}
    >
      <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
    </button>
  );

  return (
    <div
      className={`shrink-0 ${restaurantEnabled ? '' : 'pointer-events-none opacity-60'} ${className}`}
      style={variant === 'default' ? { width, minWidth: width } : undefined}
    >
      <MarketplaceKitchenCardView
        kitchen={kitchen}
        variant={variant}
        favoriteSlot={favoriteSlot}
        spotlightEyebrow="Cooking now"
      />
    </div>
  );
}
