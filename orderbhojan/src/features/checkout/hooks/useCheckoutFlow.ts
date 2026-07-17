import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { cartItemCount, useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { hasReadyDeliveryLocation, useActiveLocation } from '@/features/location';
import { runRazorpayCheckoutFlow } from '../infrastructure/razorpayCheckout';
import { formatCustomerOrderLabel } from '../domain/orderDisplay';
import { buildCheckoutPayload, buildCheckoutPrepareSignature } from '../domain/checkoutPayload';
import { useAuth } from '@/shared/providers/AuthProvider';
import { resolveCheckoutRestaurantId } from '@/lib/sanitizeLiveRestaurantContext';
import { markPerf } from '@/lib/perfMarks';
import {
  checkoutKeys,
  CHECKOUT_PREPARE_GC_MS,
  CHECKOUT_PREPARE_STALE_MS,
} from './checkoutQueryKeys';
import type { BillQuote } from '@/types/marketplace';

export interface CheckoutPlaceResponse {
  readonly orderId?: string;
  readonly draftId?: string;
  readonly orderNumber?: number | string;
  readonly upiUrl?: string;
  readonly paymentMethod?: string;
}

export interface PlacedOrderConfirmation {
  readonly orderId: string;
  readonly orderNumber: string;
}

function resolvePlacedOrder(response: CheckoutPlaceResponse): PlacedOrderConfirmation | null {
  const orderId = response.orderId ?? response.draftId;
  if (!orderId) return null;
  return {
    orderId,
    orderNumber: formatCustomerOrderLabel(response.orderNumber, orderId),
  };
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
  readonly orderNumber: string | null;
  readonly itemCount: number;
  readonly canCheckout: boolean;
  readonly placingMethod: 'cod' | 'razorpay' | 'upi' | null;
  refreshQuote: () => Promise<void>;
  prepareCheckout: () => Promise<void>;
  placeCodOrder: (phone: string, customerName?: string) => Promise<PlacedOrderConfirmation | null>;
  placeRazorpayOrder: (phone: string, customerName?: string) => Promise<PlacedOrderConfirmation | null>;
  placeUpiOrder: (phone: string, customerName?: string) => Promise<PlacedOrderConfirmation | null>;
  reset: () => void;
}

export function useCheckoutFlow(): CheckoutFlowState {
  const queryClient = useQueryClient();
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const activeLocation = useActiveLocation();
  const { sessionUser } = useAuth();

  const resolvedRestaurantId = resolveCheckoutRestaurantId(restaurantId, restaurantSlug);
  const coords = activeLocation?.coordinates;

  const [placeStatus, setPlaceStatus] = useState<'idle' | 'placing' | 'success' | 'error'>('idle');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [placingMethod, setPlacingMethod] = useState<'cod' | 'razorpay' | 'upi' | null>(null);
  const placeInFlightRef = useRef(false);

  const itemCount = cartItemCount(lines);
  const canCheckout =
    itemCount > 0 &&
    Boolean(resolvedRestaurantId) &&
    Boolean(contextToken) &&
    hasReadyDeliveryLocation(activeLocation);

  const prepareSignature = useMemo(() => {
    if (!resolvedRestaurantId || !contextToken || !coords) return null;
    return buildCheckoutPrepareSignature({
      restaurantId: resolvedRestaurantId,
      contextToken,
      lines,
      lat: coords.lat,
      lng: coords.lng,
    });
  }, [contextToken, coords, lines, resolvedRestaurantId]);

  const getPayload = useCallback(() => {
    if (!resolvedRestaurantId || !contextToken) {
      throw new Error('Restaurant context is missing. Re-open the menu and try again.');
    }
    if (lines.length === 0) {
      throw new Error('Your cart is empty.');
    }
    if (!coords) {
      throw new Error('Delivery address is required. Add your address before checkout.');
    }
    if (!hasReadyDeliveryLocation(activeLocation)) {
      throw new Error('Confirm your flat or house number before checkout.');
    }
    return buildCheckoutPayload(lines, resolvedRestaurantId, contextToken, activeLocation);
  }, [activeLocation, contextToken, coords, lines, resolvedRestaurantId]);

  const prepareQuery = useQuery({
    queryKey: checkoutKeys.prepare(prepareSignature ?? 'inactive'),
    queryFn: async () => {
      markPerf('checkout_prepare_start', 'checkout-page');
      const payload = getPayload();
      const response = await getMarketplaceApiClient().checkoutPrepare(payload);
      markPerf('checkout_prepare_end', 'checkout-page');
      markPerf('checkout_bill_ready', 'checkout-page');
      return response;
    },
    enabled: canCheckout && Boolean(prepareSignature),
    staleTime: CHECKOUT_PREPARE_STALE_MS,
    gcTime: CHECKOUT_PREPARE_GC_MS,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const quote = prepareQuery.data?.quote ?? null;
  const paymentMethods = prepareQuery.data?.paymentMethods ?? [];

  const status: CheckoutFlowStatus = useMemo(() => {
    if (placeStatus === 'placing') return 'placing';
    if (placeStatus === 'success') return 'success';
    if (placeStatus === 'error') return 'error';
    if (prepareQuery.isFetching && !prepareQuery.data) return 'preparing';
    if (prepareQuery.isError) return 'error';
    return 'idle';
  }, [placeStatus, prepareQuery.data, prepareQuery.isError, prepareQuery.isFetching]);

  const error =
    placeError ??
    (prepareQuery.error instanceof Error ? prepareQuery.error.message : null);

  const refreshQuote = useCallback(async () => {
    markPerf('checkout_prepare_start', 'refresh-quote');
    try {
      const payload = getPayload();
      const nextQuote = await getMarketplaceApiClient().quote(payload);
      if (prepareSignature) {
        queryClient.setQueryData(checkoutKeys.prepare(prepareSignature), (current: { quote: BillQuote; paymentMethods: string[] } | undefined) => ({
          paymentMethods: current?.paymentMethods ?? [],
          quote: nextQuote,
        }));
      }
      markPerf('checkout_bill_ready', 'refresh-quote');
    } catch (err) {
      setPlaceStatus('error');
      setPlaceError(err instanceof Error ? err.message : 'Unable to fetch quote');
    }
  }, [getPayload, prepareSignature, queryClient]);

  const prepareCheckout = useCallback(async () => {
    await prepareQuery.refetch();
  }, [prepareQuery]);

  const placeCodOrder = useCallback(
    async (phone: string, customerName?: string) => {
      if (placeInFlightRef.current) return null;
      placeInFlightRef.current = true;
      markPerf('pay_tap', 'cod');
      setPlacingMethod('cod');
      setPlaceStatus('placing');
      setPlaceError(null);
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
        const placed = resolvePlacedOrder(response);
        if (!placed) {
          throw new Error('Order confirmation is missing an order id');
        }
        setOrderId(placed.orderId);
        setOrderNumber(placed.orderNumber);
        setPlaceStatus('success');
        markPerf('pay_next_step', 'cod-success');
        useCartStore.getState().clear();
        return placed;
      } catch (err) {
        setPlaceStatus('error');
        setPlaceError(err instanceof Error ? err.message : 'Unable to place order');
        return null;
      } finally {
        placeInFlightRef.current = false;
        setPlacingMethod(null);
      }
    },
    [getPayload, sessionUser],
  );

  const placeRazorpayOrder = useCallback(
    async (phone: string, customerName?: string) => {
      if (placeInFlightRef.current) return null;
      placeInFlightRef.current = true;
      markPerf('pay_tap', 'razorpay');
      setPlacingMethod('razorpay');
      setPlaceStatus('placing');
      setPlaceError(null);
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

        const confirmed = await runRazorpayCheckoutFlow({
          draftId,
          phone: phone.trim(),
          customerName: customerName?.trim() || sessionUser?.displayName || undefined,
          customerEmail: sessionUser?.email ?? undefined,
          userId: sessionUser?.uid ?? null,
          orderNumber: response.orderNumber,
        });

        setOrderId(confirmed.orderId);
        setOrderNumber(confirmed.orderNumber);
        setPlaceStatus('success');
        markPerf('pay_next_step', 'razorpay-success');
        useCartStore.getState().clear();
        return {
          orderId: confirmed.orderId,
          orderNumber: confirmed.orderNumber,
        };
      } catch (err) {
        setPlaceStatus('error');
        setPlaceError(err instanceof Error ? err.message : 'Unable to complete payment');
        return null;
      } finally {
        placeInFlightRef.current = false;
        setPlacingMethod(null);
      }
    },
    [getPayload, sessionUser],
  );

  const placeUpiOrder = useCallback(
    async (phone: string, customerName?: string) => {
      if (placeInFlightRef.current) return null;
      placeInFlightRef.current = true;
      markPerf('pay_tap', 'upi');
      setPlacingMethod('upi');
      setPlaceStatus('placing');
      setPlaceError(null);
      try {
        const payload = {
          ...getPayload(),
          paymentMethod: 'upi' as const,
          phone: phone.trim(),
          customerName: customerName?.trim() || undefined,
          userId: sessionUser?.uid ?? null,
          userEmail: sessionUser?.email ?? null,
        };
        const response = (await getMarketplaceApiClient().checkoutPlace(
          payload,
        )) as CheckoutPlaceResponse;
        const placed = resolvePlacedOrder(response);
        if (!placed) {
          throw new Error('Order confirmation is missing an order id');
        }
        if (response.upiUrl && typeof window !== 'undefined') {
          window.location.href = response.upiUrl;
        }
        setOrderId(placed.orderId);
        setOrderNumber(placed.orderNumber);
        setPlaceStatus('success');
        markPerf('pay_next_step', 'upi-success');
        useCartStore.getState().clear();
        return placed;
      } catch (err) {
        setPlaceStatus('error');
        setPlaceError(err instanceof Error ? err.message : 'Unable to place UPI order');
        return null;
      } finally {
        placeInFlightRef.current = false;
        setPlacingMethod(null);
      }
    },
    [getPayload, sessionUser],
  );

  const reset = useCallback(() => {
    placeInFlightRef.current = false;
    setPlacingMethod(null);
    setPlaceStatus('idle');
    setPlaceError(null);
    setOrderId(null);
    setOrderNumber(null);
    if (prepareSignature) {
      void queryClient.removeQueries({ queryKey: checkoutKeys.prepare(prepareSignature) });
    }
  }, [prepareSignature, queryClient]);

  return {
    quote,
    paymentMethods,
    status,
    error,
    orderId,
    orderNumber,
    itemCount,
    canCheckout,
    placingMethod,
    refreshQuote,
    prepareCheckout,
    placeCodOrder,
    placeRazorpayOrder,
    placeUpiOrder,
    reset,
  };
}
