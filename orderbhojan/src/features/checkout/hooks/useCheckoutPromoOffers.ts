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
  const availableOffers = useRestaurantContextStore((s) => s.availableOffers);
  const availablePromoCodes = useRestaurantContextStore((s) => s.availablePromoCodes);
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const liveQuery = getMarketplaceQueryBehavior();

  const needsFetch =
    enabled &&
    Boolean(restaurantSlug) &&
    availableOffers.length === 0 &&
    availablePromoCodes.length === 0;

  const query = useQuery({
    queryKey: restaurantKeys.experience(restaurantSlug ?? '', coords.lat, coords.lng),
    queryFn: () =>
      loadRestaurantExperience({
        slug: restaurantSlug!,
        lat: coords.lat,
        lng: coords.lng,
      }),
    enabled: needsFetch,
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

  const offers = query.data?.experience.offers ?? availableOffers;
  const promoCodes = query.data?.experience.promoCodes ?? availablePromoCodes;

  return useMemo(
    () => ({
      offers,
      promoCodes,
      selectableCodes: listCopyableCouponCodes({ offers, promoCodes }),
      isLoading: needsFetch && query.isLoading,
    }),
    [needsFetch, offers, promoCodes, query.isLoading],
  );
}
