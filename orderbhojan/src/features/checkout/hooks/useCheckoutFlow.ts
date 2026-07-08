import { useCallback, useState } from 'react';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { cartItemCount, useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { runRazorpayCheckoutFlow } from '../infrastructure/razorpayCheckout';
import { useAuth } from '@/shared/providers/AuthProvider';
import { resolveCheckoutRestaurantId } from '@/lib/sanitizeLiveRestaurantContext';
import type { BillQuote } from '@/types/marketplace';

export interface CheckoutPlaceResponse {
  readonly orderId?: string;
  readonly draftId?: string;
}

function resolvePlacedOrderId(response: CheckoutPlaceResponse): string | null {
  return response.orderId ?? response.draftId ?? null;
}

export type CheckoutFlowStatus =
  | 'idle'
  | 'quoting'
  | 'preparing'
  | 'placing'
  | 'success'
  | 'error';

export interface CheckoutFlowState {
  readonly quote: BillQuote | null;
  readonly paymentMethods: readonly string[];
  readonly status: CheckoutFlowStatus;
  readonly error: string | null;
  readonly orderId: string | null;
  readonly itemCount: number;
  readonly canCheckout: boolean;
  refreshQuote: () => Promise<void>;
  prepareCheckout: () => Promise<void>;
  placeCodOrder: (phone: string, customerName?: string) => Promise<string | null>;
  placeRazorpayOrder: (phone: string, customerName?: string) => Promise<string | null>;
  reset: () => void;
}

function buildCheckoutPayload(
  lines: ReturnType<typeof useCartStore.getState>['lines'],
  restaurantId: string,
  contextToken: string,
  coords: { lat: number; lng: number },
) {
  return {
    restaurantId,
    contextToken,
    orderType: 'delivery' as const,
    lines: lines.map((line) => ({
      itemId: line.foodId,
      quantity: line.quantity,
    })),
    deliveryAddress: { lat: coords.lat, lng: coords.lng },
  };
}

export function useCheckoutFlow(): CheckoutFlowState {
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const activeLocation = useActiveLocation();
  const { sessionUser } = useAuth();

  const resolvedRestaurantId = resolveCheckoutRestaurantId(restaurantId, restaurantSlug);

  const [quote, setQuote] = useState<BillQuote | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<CheckoutFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const itemCount = cartItemCount(lines);
  const canCheckout =
    itemCount > 0 && Boolean(resolvedRestaurantId) && Boolean(contextToken);

  const getPayload = useCallback(() => {
    if (!resolvedRestaurantId || !contextToken) {
      throw new Error('Restaurant context is missing. Re-open the menu and try again.');
    }
    if (lines.length === 0) {
      throw new Error('Your cart is empty.');
    }
    const coords = resolveRestaurantCoords(activeLocation ?? null);
    return buildCheckoutPayload(lines, resolvedRestaurantId, contextToken, coords);
  }, [activeLocation, contextToken, lines, resolvedRestaurantId]);

  const refreshQuote = useCallback(async () => {
    setStatus('quoting');
    setError(null);
    try {
      const payload = getPayload();
      const nextQuote = await getMarketplaceApiClient().quote(payload);
      setQuote(nextQuote);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to fetch quote');
    }
  }, [getPayload]);

  const prepareCheckout = useCallback(async () => {
    setStatus('preparing');
    setError(null);
    try {
      const payload = getPayload();
      const response = await getMarketplaceApiClient().checkoutPrepare(payload);
      setQuote(response.quote);
      setPaymentMethods(response.paymentMethods);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to prepare checkout');
    }
  }, [getPayload]);

  const placeCodOrder = useCallback(
    async (phone: string, customerName?: string) => {
      setStatus('placing');
      setError(null);
      try {
        const payload = {
          ...getPayload(),
          paymentMethod: 'cod',
          phone: phone.trim(),
          customerName: customerName?.trim() || undefined,
          userId: sessionUser?.uid ?? null,
          userEmail: sessionUser?.email ?? null,
        };
        const response = (await getMarketplaceApiClient().checkoutPlace(
          payload,
        )) as CheckoutPlaceResponse;
        const placedOrderId = resolvePlacedOrderId(response);
        if (!placedOrderId) {
          throw new Error('Order confirmation is missing an order id');
        }
        setOrderId(placedOrderId);
        setStatus('success');
        useCartStore.getState().clear();
        return placedOrderId;
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to place order');
        return null;
      }
    },
    [getPayload, sessionUser],
  );

  const placeRazorpayOrder = useCallback(
    async (phone: string, customerName?: string) => {
      setStatus('placing');
      setError(null);
      try {
        const payload = {
          ...getPayload(),
          paymentMethod: 'razorpay',
          phone: phone.trim(),
          customerName: customerName?.trim() || undefined,
          userId: sessionUser?.uid ?? null,
          userEmail: sessionUser?.email ?? null,
        };
        const response = (await getMarketplaceApiClient().checkoutPlace(
          payload,
        )) as CheckoutPlaceResponse;
        const draftId = response.draftId ?? response.orderId;
        if (!draftId) {
          throw new Error('Payment session is missing a draft id');
        }

        const confirmedOrderId = await runRazorpayCheckoutFlow({
          draftId,
          phone: phone.trim(),
          customerName: customerName?.trim() || sessionUser?.displayName || undefined,
          customerEmail: sessionUser?.email ?? undefined,
          userId: sessionUser?.uid ?? null,
        });

        setOrderId(confirmedOrderId);
        setStatus('success');
        useCartStore.getState().clear();
        return confirmedOrderId;
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to complete payment');
        return null;
      }
    },
    [getPayload, sessionUser],
  );

  const reset = useCallback(() => {
    setQuote(null);
    setPaymentMethods([]);
    setStatus('idle');
    setError(null);
    setOrderId(null);
  }, []);

  return {
    quote,
    paymentMethods,
    status,
    error,
    orderId,
    itemCount,
    canCheckout,
    refreshQuote,
    prepareCheckout,
    placeCodOrder,
    placeRazorpayOrder,
    reset,
  };
}
