import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, MapPin, Star } from 'lucide-react';
import { MarketplaceKitchenCardView } from '@bhojan/storefront-design-system/marketplace/MarketplaceKitchenCard';
import type { MockRestaurant } from '@/features/experience/domain/experience.types';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';
import { useRestaurantFeatureEnabled } from '@/features/restaurant';
import { mapMockRestaurantToKitchenCard } from './mapRestaurantToKitchenCard';
import { formatDistanceKmLabel } from '@/features/discovery/utils/distanceDisplay';

export interface OrderBhojanMockKitchenCardProps {
  readonly restaurant: MockRestaurant;
  readonly variant?: 'default' | 'spotlight' | 'grid' | 'list';
  readonly width?: string;
  readonly className?: string;
}

function GridKitchenThumbnail({
  src,
  alt,
}: {
  readonly src?: string;
  readonly alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs text-white/40">
      Kitchen
    </div>
  );
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
  const offerBadge = kitchen.badges.find((badge) => badge.id === 'offer');

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

  if (variant === 'list') {
    return (
      <div
        className={`min-w-0 border-b border-white/[0.06] last:border-b-0 ${
          restaurantEnabled ? '' : 'pointer-events-none opacity-60'
        } ${className}`}
        aria-label={`${restaurant.name}, rated ${restaurant.rating ?? '—'}`}
      >
        <MarketplaceKitchenCardView
          kitchen={kitchen}
          variant="list"
          favoriteSlot={favoriteSlot}
        />
      </div>
    );
  }

  if (variant === 'grid') {
    const distanceLabel = formatDistanceKmLabel(kitchen.distanceKm);

    return (
      <div
        className={`min-w-0 ${restaurantEnabled ? '' : 'pointer-events-none opacity-60'} ${className}`}
        aria-label={`${restaurant.name}, rated ${restaurant.rating ?? '—'}`}
      >
        <Link
          to={kitchen.storePath}
          className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[#FF7A00]/40 hover:bg-white/[0.05] hover:shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        >
          <div className="relative aspect-[5/4] overflow-hidden bg-white/5">
            <GridKitchenThumbnail src={kitchen.thumbnailUrl} alt={kitchen.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute right-2 top-2 z-10">{favoriteSlot}</div>
            {offerBadge ? (
              <span className="absolute bottom-2 left-2 rounded-full border border-[#FF7A00]/40 bg-[#FF7A00]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF7A00]">
                {offerBadge.label}
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5 p-3">
            <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-[#FF7A00]">
              {kitchen.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              {distanceLabel ? (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {distanceLabel}
                </span>
              ) : null}
              {kitchen.etaMins !== undefined ? (
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" aria-hidden />
                  {kitchen.etaMins} min
                </span>
              ) : null}
              {kitchen.rating !== undefined ? (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                  {kitchen.rating.toFixed(1)}
                </span>
              ) : null}
            </div>
            {kitchen.cuisineTags?.length ? (
              <p className="line-clamp-1 text-xs text-white/50">{kitchen.cuisineTags.join(' · ')}</p>
            ) : null}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 ${restaurantEnabled ? '' : 'pointer-events-none opacity-60'} ${className}`}
      style={variant === 'default' ? { width, minWidth: width } : undefined}
    >
      <MarketplaceKitchenCardView
        kitchen={kitchen}
        variant={variant === 'spotlight' ? 'spotlight' : 'default'}
        favoriteSlot={favoriteSlot}
        spotlightEyebrow="Cooking now"
      />
    </div>
  );
}
