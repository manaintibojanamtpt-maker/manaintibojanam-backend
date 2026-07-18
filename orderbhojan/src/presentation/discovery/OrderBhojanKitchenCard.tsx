import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Heart, MapPin, Star } from 'lucide-react';
import { MarketplaceKitchenCardView } from '@bhojan/storefront-design-system/marketplace/MarketplaceKitchenCard';
import type { RestaurantPublic } from '@/types/marketplace';
import { useRestaurantFeatureEnabled } from '@/features/restaurant';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';
import { mapRestaurantPublicToKitchenCard } from './mapRestaurantToKitchenCard';
import { formatDistanceKmLabel } from '@/features/discovery/utils/distanceDisplay';
import { useActiveLocation } from '@/features/location';
import {
  loadRestaurantExperience,
  resolveRestaurantCoords,
} from '@/features/restaurant/engine/restaurantExperienceLayer';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';

export interface OrderBhojanKitchenCardProps {
  readonly restaurant: RestaurantPublic;
  readonly variant?: 'default' | 'spotlight' | 'grid';
  readonly width?: string;
  readonly className?: string;
  readonly imageLoading?: 'lazy' | 'eager';
}

function GridKitchenThumbnail({
  src,
  alt,
  loading,
}: {
  readonly src?: string;
  readonly alt: string;
  readonly loading: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
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

export function OrderBhojanKitchenCard({
  restaurant,
  variant = 'default',
  width = '17.5rem',
  className = '',
  imageLoading = 'lazy',
}: OrderBhojanKitchenCardProps) {
  const restaurantEnabled = useRestaurantFeatureEnabled();
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const liveQuery = getMarketplaceQueryBehavior();
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggle = useFavoritesStore((s) => s.toggle);
  const favorite = isFavorite(restaurant.restaurantId);

  const prefetchRestaurant = useCallback(() => {
    if (!restaurantEnabled || !restaurant.restaurantSlug) return;
    const coords = resolveRestaurantCoords(activeLocation);
    void queryClient.prefetchQuery({
      queryKey: restaurantKeys.experience(restaurant.restaurantSlug, coords.lat, coords.lng),
      queryFn: () =>
        loadRestaurantExperience({
          slug: restaurant.restaurantSlug,
          lat: coords.lat,
          lng: coords.lng,
        }),
      staleTime: liveQuery.staleTime,
    });
  }, [
    activeLocation,
    liveQuery.staleTime,
    queryClient,
    restaurant.restaurantSlug,
    restaurantEnabled,
  ]);

  const prefetchKitchenNavigation = useCallback(() => {
    prefetchRestaurant();
    void import('@/features/restaurant');
    void import('@/features/food/ui/FoodRoutePage');
  }, [prefetchRestaurant]);

  const kitchen = useMemo(() => mapRestaurantPublicToKitchenCard(restaurant), [restaurant]);
  const isGridCard = variant === 'grid' || className.includes('lg:w-full');
  const offerBadge = kitchen.badges.find((badge) => badge.id === 'offer');

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

  if (variant === 'grid') {
    const distanceKm = kitchen.distanceKm;
    const distanceLabel = formatDistanceKmLabel(distanceKm);

    return (
      <div
        className={`min-w-0 ${restaurantEnabled ? '' : 'pointer-events-none opacity-60'} ${className}`}
        aria-label={`${restaurant.displayName}, rated ${restaurant.rating ?? '—'}`}
      >
        <Link
          to={kitchen.storePath}
          className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[#FF7A00]/40 hover:bg-white/[0.05] hover:shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          onMouseEnter={prefetchKitchenNavigation}
          onFocus={prefetchKitchenNavigation}
          onPointerDown={prefetchKitchenNavigation}
        >
          <div className="relative aspect-[5/4] overflow-hidden bg-white/5">
            <GridKitchenThumbnail
              src={kitchen.thumbnailUrl}
              alt={kitchen.name}
              loading={imageLoading}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute right-2 top-2 z-10">{favoriteSlot}</div>
            {offerBadge ? (
              <span className="absolute bottom-2 left-2 rounded-full border border-[#FF7A00]/40 bg-[#FF7A00]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF7A00]">
                {offerBadge.label}
              </span>
            ) : null}
            {!kitchen.isOpen ? (
              <span className="absolute left-2 top-2 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                Closed
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
      className={`shrink-0 ${restaurantEnabled ? '' : 'pointer-events-none opacity-60'} ${
        variant === 'default' && !isGridCard ? '' : 'min-w-0'
      } ${className}`}
      style={variant === 'default' && !isGridCard ? { width, minWidth: width } : undefined}
      aria-label={`${restaurant.displayName}, rated ${restaurant.rating ?? '—'}`}
      onMouseEnter={prefetchKitchenNavigation}
      onFocus={prefetchKitchenNavigation}
      onPointerDown={prefetchKitchenNavigation}
    >
      <MarketplaceKitchenCardView
        kitchen={kitchen}
        variant={variant === 'spotlight' ? 'spotlight' : 'default'}
        favoriteSlot={favoriteSlot}
        imageLoading={imageLoading}
        className={variant === 'spotlight' ? 'h-full' : 'h-full'}
        spotlightEyebrow="Cooking now"
      />
    </div>
  );
}
