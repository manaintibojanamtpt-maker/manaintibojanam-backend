import { useEffect } from 'react';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { persistKitchenPaymentMethods } from '../infrastructure/kitchenPaymentMethodsCache';

/**
 * Instant Pay using: fetch kitchen payment methods without waiting for quote/prepare.
 * Safe no-op if backend has not deployed `/payment-methods` yet.
 */
export function useKitchenPaymentMethodsPrefetch(enabled = true): void {
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const known = useRestaurantContextStore((s) => s.paymentMethods);

  useEffect(() => {
    if (!enabled || !restaurantSlug) return;
    if (known && known.length > 1) return; // already have more than COD fallback

    let cancelled = false;
    void (async () => {
      try {
        const result = await getMarketplaceApiClient().getRestaurantPaymentMethods(restaurantSlug);
        if (cancelled || !result.paymentMethods?.length) return;
        useRestaurantContextStore.getState().setPaymentMethods(result.paymentMethods);
        const id = restaurantId ?? `obr_${restaurantSlug}`;
        persistKitchenPaymentMethods(id, result.paymentMethods);
      } catch {
        // Endpoint may be missing until backend deploy — prepare still fills methods later.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, known, restaurantId, restaurantSlug]);
}
