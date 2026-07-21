import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { listCopyableCouponCodes } from '@/features/restaurant/domain/promoOffers';
import {
  loadRestaurantExperience,
  resolveRestaurantCoords,
} from '@/features/restaurant/engine/restaurantExperienceLayer';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';

export function useCheckoutPromoOffers(enabled = true) {
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const lat = coords?.lat ?? 0;
  const lng = coords?.lng ?? 0;
  const liveQuery = getMarketplaceQueryBehavior();

  const shouldFetch = enabled && Boolean(restaurantSlug);

  const query = useQuery({
    queryKey: restaurantKeys.experience(restaurantSlug ?? '', lat, lng),
    queryFn: () =>
      loadRestaurantExperience({
        slug: restaurantSlug!,
        lat,
        lng,
      }),
    enabled: shouldFetch,
    ...liveQuery,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!query.data) return;
    useRestaurantContextStore.getState().setPromoContext({
      offers: query.data.experience.offers,
      promoCodes: query.data.experience.promoCodes,
    });
  }, [query.data]);

  const offers = query.data?.experience.offers ?? [];
  const promoCodes = query.data?.experience.promoCodes ?? [];

  return useMemo(
    () => ({
      offers,
      promoCodes,
      selectableCodes: listCopyableCouponCodes({ offers, promoCodes }),
      isLoading: shouldFetch && query.isLoading,
    }),
    [offers, promoCodes, query.isLoading, shouldFetch],
  );
}
