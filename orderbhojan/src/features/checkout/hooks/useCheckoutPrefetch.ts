import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { hasReadyDeliveryLocation, useActiveLocation } from '@/features/location';
import { resolveCheckoutRestaurantId } from '@/lib/sanitizeLiveRestaurantContext';
import { markPerf } from '@/lib/perfMarks';
import { buildCheckoutPayload, buildCheckoutPrepareSignature } from '../domain/checkoutPayload';
import {
  buildCheckoutCartSignature,
  clearCheckoutPrepareSessionForCart,
  persistCheckoutPrepareSession,
  cloneCheckoutPrepareForQuery,
  isCheckoutPrepareSessionCompatible,
} from '../infrastructure/checkoutQuoteSession';
import { checkoutKeys, CHECKOUT_PREPARE_GC_MS, CHECKOUT_PREPARE_STALE_MS, CHECKOUT_PREPARE_TIMEOUT_MS } from './checkoutQueryKeys';

export function useCheckoutPrefetch(enabled = true): void {
  const queryClient = useQueryClient();
  const prefetchGenerationRef = useRef(0);
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const appliedCouponCode = useRestaurantContextStore((s) => s.appliedCouponCode);
  const activeLocation = useActiveLocation();

  const resolvedRestaurantId = resolveCheckoutRestaurantId(restaurantId, restaurantSlug);
  const coords = activeLocation?.coordinates;
  const canPrefetch =
    enabled &&
    lines.length > 0 &&
    Boolean(resolvedRestaurantId) &&
    Boolean(contextToken) &&
    hasReadyDeliveryLocation(activeLocation) &&
    Boolean(coords);

  useEffect(() => {
    if (!canPrefetch || !resolvedRestaurantId || !contextToken || !coords) return;

    const signature = buildCheckoutPrepareSignature({
      restaurantId: resolvedRestaurantId,
      contextToken,
      lines,
      lat: coords.lat,
      lng: coords.lng,
      couponCode: appliedCouponCode,
    });
    const cartSignature = buildCheckoutCartSignature({
      restaurantId: resolvedRestaurantId,
      contextToken,
      lines,
      couponCode: appliedCouponCode,
    });
    const payload = buildCheckoutPayload(
      lines,
      resolvedRestaurantId,
      contextToken,
      activeLocation,
      'ASAP',
      appliedCouponCode,
    );

    markPerf('checkout_prepare_start', 'prefetch');
    const generation = ++prefetchGenerationRef.current;
    void queryClient
      .prefetchQuery({
        queryKey: checkoutKeys.prepare(signature),
        queryFn: async ({ signal }) => {
          const response = await getMarketplaceApiClient().checkoutPrepare(payload, {
            signal,
            timeoutMs: CHECKOUT_PREPARE_TIMEOUT_MS,
          });
          const next = cloneCheckoutPrepareForQuery(response);
          if (
            generation === prefetchGenerationRef.current &&
            isCheckoutPrepareSessionCompatible(response, appliedCouponCode)
          ) {
            persistCheckoutPrepareSession(signature, cartSignature, response);
          }
          if (resolvedRestaurantId && response.paymentMethods?.length) {
            const { persistKitchenPaymentMethods } = await import(
              '../infrastructure/kitchenPaymentMethodsCache'
            );
            persistKitchenPaymentMethods(resolvedRestaurantId, response.paymentMethods);
          }
          markPerf('checkout_prepare_end', 'prefetch');
          markPerf('checkout_bill_ready', 'prefetch');
          return next;
        },
        staleTime: CHECKOUT_PREPARE_STALE_MS,
        gcTime: CHECKOUT_PREPARE_GC_MS,
      })
      .catch(() => {
        clearCheckoutPrepareSessionForCart(cartSignature);
        // Prefetch failures are non-blocking; checkout page will retry.
      });
  }, [activeLocation, appliedCouponCode, canPrefetch, contextToken, coords, lines, queryClient, resolvedRestaurantId]);
}
