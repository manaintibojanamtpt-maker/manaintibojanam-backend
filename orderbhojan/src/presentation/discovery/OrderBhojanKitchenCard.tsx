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
import { loadFoodMenu } from '@/features/food/engine/foodExperienceLayer';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';

export interface OrderBhojanKitchenCardProps {
  readonly restaurant: RestaurantPublic;
  readonly variant?: 'default' | 'spotlight' | 'grid' | 'list';
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
    if (!coords) return;
    void queryClient.prefetchQuery({
      queryKey: restaurantKeys.experience(restaurant.restaurantSlug, coords.lat, coords.lng),
      queryFn: () =>
        loadRestaurantExperience({
          slug: restaurant.restaurantSlug,
          lat: coords.lat,
          lng: coords.lng,
        }),
      staleTime: Math.max(liveQuery.staleTime, 60_000),
      gcTime: Math.max(liveQuery.gcTime, 15 * 60_000),
    });
  }, [
    activeLocation,
    liveQuery.gcTime,
    liveQuery.staleTime,
    queryClient,
    restaurant.restaurantSlug,
    restaurantEnabled,
  ]);

  const prefetchKitchenNavigation = useCallback(() => {
    if (!restaurant.restaurantSlug) return;
    const coords = resolveRestaurantCoords(activeLocation);
    if (!coords) {
      prefetchRestaurant();
      return;
    }
    prefetchRestaurant();
    void queryClient.prefetchQuery({
      queryKey: foodKeys.menu(restaurant.restaurantSlug, coords.lat, coords.lng),
      queryFn: () =>
        loadFoodMenu({
          slug: restaurant.restaurantSlug,
          lat: coords.lat,
          lng: coords.lng,
        }),
      staleTime: Math.max(liveQuery.staleTime, 60_000),
      gcTime: Math.max(liveQuery.gcTime, 15 * 60_000),
    });
    void import('@/features/restaurant');
    void import('@/features/food/ui/FoodRoutePage');
  }, [activeLocation, liveQuery.gcTime, liveQuery.staleTime, prefetchRestaurant, queryClient, restaurant.restaurantSlug]);

  const kitchen = useMemo(() => mapRestaurantPublicToKitchenCard(restaurant), [restaurant]);
  const kitchenLinkState = useMemo(
    () => ({ kitchenName: restaurant.displayName }),
    [restaurant.displayName],
  );
  const isGridCard = variant === 'grid' || className.includes('lg:w-full');
  const offerBadge = kitchen.badges.find((badge) => badge.id === 'offer');

  const favoriteSlot = (
    <button
      type="button"
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--mib-border,white/10)] bg-black/50 backdrop-blur-md transition hover:border-[#e85d04]/40 touch-manipulation ${
        favorite ? 'text-[#e85d04]' : 'text-white/70'
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

  if (variant === 'list') {
    const listFavoriteSlot = (
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:text-[#e85d04] touch-manipulation ${
          favorite ? 'text-[#e85d04]' : ''
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
        <Heart className="h-3.5 w-3.5" fill={favorite ? 'currentColor' : 'none'} />
      </button>
    );

    return (
      <div
        className={`min-w-0 border-b border-white/[0.06] last:border-b-0 ${
          restaurantEnabled ? '' : 'pointer-events-none opacity-60'
        } ${className}`}
        aria-label={`${restaurant.displayName}, rated ${restaurant.rating ?? '—'}`}
        onMouseEnter={prefetchKitchenNavigation}
        onFocus={prefetchKitchenNavigation}
        onPointerDown={prefetchKitchenNavigation}
        onTouchStart={prefetchKitchenNavigation}
      >
        <MarketplaceKitchenCardView
          kitchen={kitchen}
          variant="list"
          favoriteSlot={listFavoriteSlot}
          imageLoading={imageLoading}
          linkState={kitchenLinkState}
        />
      </div>
    );
  }

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
          state={kitchenLinkState}
          className="group block h-full overflow-hidden rounded-2xl border border-[color:var(--mib-border,white/10)] bg-[#120d0c] transition hover:border-[#e85d04]/40 hover:bg-[#120d0c]/90 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
          onMouseEnter={prefetchKitchenNavigation}
          onFocus={prefetchKitchenNavigation}
          onPointerDown={prefetchKitchenNavigation}
          onTouchStart={prefetchKitchenNavigation}
        >
          <div className="relative aspect-[5/4] overflow-hidden bg-white/5">
            <GridKitchenThumbnail
              src={kitchen.thumbnailUrl}
              alt={kitchen.name}
              loading={imageLoading}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute right-2 top-2 z-10">{favoriteSlot}</div>
            {offerBadge ? (
              <span className="absolute bottom-2 left-2 rounded-full border border-[#e85d04]/40 bg-[#e85d04]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e85d04]">
                {offerBadge.label}
              </span>
            ) : null}
            {!kitchen.isOpen ? (
              <span className="absolute left-2 top-2 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                Closed
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5 p-3.5">
            <h3 className="line-clamp-1 text-sm font-bold text-[#fff8f0] group-hover:text-[#e85d04]">
              {kitchen.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#c4b5a5]">
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
              <p className="line-clamp-1 text-xs text-[#c4b5a5]/80">{kitchen.cuisineTags.join(' · ')}</p>
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
      onTouchStart={prefetchKitchenNavigation}
    >
      <MarketplaceKitchenCardView
        kitchen={kitchen}
        variant={variant === 'spotlight' ? 'spotlight' : 'default'}
        favoriteSlot={favoriteSlot}
        imageLoading={imageLoading}
        className={variant === 'spotlight' ? 'h-full' : 'h-full'}
        spotlightEyebrow="Cooking now"
        linkState={kitchenLinkState}
      />
    </div>
  );
}
