import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { cartItemCount, useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { hasReadyDeliveryLocation, useActiveLocation } from '@/features/location';
import { runRazorpayCheckoutFlow } from '../infrastructure/razorpayCheckout';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';
import {
  buildCheckoutCartSignature,
  clearCheckoutPrepareSessionForCart,
  clearCheckoutPrepareSessionsExcept,
  persistCheckoutPrepareSession,
  readCheckoutPrepareSession,
  cloneCheckoutPrepareForQuery,
  isCheckoutPrepareSessionCompatible,
  type CheckoutPrepareQueryData,
} from '../infrastructure/checkoutQuoteSession';
import {
  persistKitchenPaymentMethods,
  readKitchenPaymentMethods,
} from '../infrastructure/kitchenPaymentMethodsCache';
import {
  claimCustomerUpiPayment,
  fetchOrderPaymentSnapshot,
  pollUpiPaymentStatus,
} from '../infrastructure/upiCheckout';
import { formatCustomerOrderLabel } from '../domain/orderDisplay';
import { buildCheckoutPayload, buildCheckoutPrepareSignature } from '../domain/checkoutPayload';
import {
  resolveDefaultDeliverySlot,
} from '../domain/deliveryTimeSlots';
import { tryResolveSlotFromScheduleAction } from '../domain/resolveVoiceScheduleSlot';
import { useCheckoutScheduleStore } from '../store/checkoutScheduleStore';
import { useAuth } from '@/shared/providers/AuthProvider';
import { resolveCheckoutAuthGate } from '@/features/auth/domain/checkoutAuth';
import { resolveCheckoutRestaurantId } from '@/lib/sanitizeLiveRestaurantContext';
import { markPerf } from '@/lib/perfMarks';
import { obDebugTrustEvent } from '@/lib/obDebug';
import { getUpiPlatform, logUpiDiag, shortIdentifier, upiErrorCategory } from '@/lib/upiDiagnostics';
import { MarketplaceApiError } from '@/marketplace-api/errors';
import {
  checkoutKeys,
  CHECKOUT_PREPARE_GC_MS,
  CHECKOUT_PREPARE_STALE_MS,
  CHECKOUT_PREPARE_TIMEOUT_MS,
} from './checkoutQueryKeys';
import type { BillQuote, CheckoutSchedulingContext } from '@/types/marketplace';

export interface CheckoutPlaceResponse {
  readonly orderId?: string;
  readonly draftId?: string;
  readonly orderNumber?: number | string;
  readonly upiUrl?: string;
  readonly paymentMethod?: string;
  readonly paymentStatus?: string;
  readonly amount?: number;
  readonly amountInPaise?: number;
  readonly expiresAt?: string;
}

export interface UpiPaymentSession {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly upiUrl: string;
  readonly amount: number;
  readonly expiresAt?: string;
  readonly phone: string;
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
  | 'awaiting_payment'
  | 'success'
  | 'error';

export interface CheckoutFlowState {
  readonly quote: BillQuote | null;
  readonly scheduling: CheckoutSchedulingContext | null;
  readonly deliveryTimeSlot: string;
  readonly paymentMethods: readonly string[];
  readonly status: CheckoutFlowStatus;
  readonly error: string | null;
  readonly orderId: string | null;
  readonly orderNumber: string | null;
  readonly upiSession: UpiPaymentSession | null;
  readonly upiVerifying: boolean;
  readonly upiPollMessage: string | null;
  readonly itemCount: number;
  readonly canCheckout: boolean;
  readonly placingMethod: 'cod' | 'razorpay' | 'upi' | null;
  readonly quoteIsRefreshing: boolean;
  readonly quoteIsStale: boolean;
  readonly discountQuoteLoading: boolean;
  readonly cartSyncMessages: readonly string[];
  readonly appliedCouponCode: string | null;
  readonly setAppliedCouponCode: (code: string | null) => void;
  readonly voiceScheduleNotice: {
    readonly kind: 'applied' | 'clarify' | 'error';
    readonly message: string;
    readonly reason?: string;
  } | null;
  setDeliveryTimeSlot: (slot: string) => void;
  refreshQuote: () => Promise<void>;
  prepareCheckout: () => Promise<void>;
  placeCodOrder: (
    phone: string,
    customerName?: string,
    notificationEmail?: string,
  ) => Promise<PlacedOrderConfirmation | null>;
  placeRazorpayOrder: (
    phone: string,
    customerName?: string,
    notificationEmail?: string,
  ) => Promise<PlacedOrderConfirmation | null>;
  placeUpiOrder: (
    phone: string,
    customerName?: string,
    notificationEmail?: string,
  ) => Promise<PlacedOrderConfirmation | null>;
  checkUpiPayment: () => Promise<void>;
  notifyKitchenUpiPaid: (upiReference?: string) => Promise<void>;
  reset: () => void;
}

export function useCheckoutFlow(): CheckoutFlowState {
  const queryClient = useQueryClient();
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const appliedCouponCode = useRestaurantContextStore((s) => s.appliedCouponCode);
  const storePaymentMethods = useRestaurantContextStore((s) => s.paymentMethods);
  const setAppliedCouponCode = useRestaurantContextStore((s) => s.setAppliedCouponCode);
  const activeLocation = useActiveLocation();
  const { sessionUser, status: authStatus } = useAuth();

  const resolvedRestaurantId = resolveCheckoutRestaurantId(restaurantId, restaurantSlug);
  const coords = activeLocation?.coordinates;

  const [placeStatus, setPlaceStatus] = useState<
    'idle' | 'placing' | 'awaiting_payment' | 'success' | 'error'
  >('idle');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [upiSession, setUpiSession] = useState<UpiPaymentSession | null>(null);
  const [upiVerifying, setUpiVerifying] = useState(false);
  const [upiPollMessage, setUpiPollMessage] = useState<string | null>(null);
  const [placingMethod, setPlacingMethod] = useState<'cod' | 'razorpay' | 'upi' | null>(null);
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('ASAP');
  const voiceSchedulePref = useCheckoutScheduleStore((s) => s.preference);
  const voiceScheduleUpdatedAt = useCheckoutScheduleStore((s) => s.updatedAt);
  const voiceScheduleNotice = useCheckoutScheduleStore((s) => s.notice);
  const placeInFlightRef = useRef(false);
  const upiPollAbortRef = useRef<AbortController | null>(null);
  const previousPrepareSignatureRef = useRef<string | null>(null);
  const previousCouponRef = useRef<string | null>(appliedCouponCode);
  const incompatiblePrepareRecoveryRef = useRef<string | null>(null);

  const checkoutAuthGate = useMemo(
    () => resolveCheckoutAuthGate({ status: authStatus, sessionUser }),
    [authStatus, sessionUser],
  );

  const assertCanPlaceOrder = useCallback(() => {
    if (checkoutAuthGate.allowed) return;
    throw new Error(checkoutAuthGate.message);
  }, [checkoutAuthGate.allowed, checkoutAuthGate.message]);

  const itemCount = cartItemCount(lines);
  const canCheckout =
    itemCount > 0 &&
    Boolean(resolvedRestaurantId) &&
    Boolean(contextToken) &&
    hasReadyDeliveryLocation(activeLocation);

  const { syncMessages: cartSyncMessages } = useCartValidation({ enabled: canCheckout, autoApply: true });

  const prepareSignature = useMemo(() => {
    if (!resolvedRestaurantId || !contextToken || !coords) return null;
    return buildCheckoutPrepareSignature({
      restaurantId: resolvedRestaurantId,
      contextToken,
      lines,
      lat: coords.lat,
      lng: coords.lng,
      couponCode: appliedCouponCode,
    });
  }, [appliedCouponCode, contextToken, coords, lines, resolvedRestaurantId]);

  const cartSignature = useMemo(() => {
    if (!resolvedRestaurantId || !contextToken) return null;
    return buildCheckoutCartSignature({
      restaurantId: resolvedRestaurantId,
      contextToken,
      lines,
      couponCode: appliedCouponCode,
    });
  }, [appliedCouponCode, contextToken, lines, resolvedRestaurantId]);

  const sessionPrepare = useMemo(() => {
    if (!cartSignature || !prepareSignature) return null;
    const cached = readCheckoutPrepareSession(cartSignature, prepareSignature);
    if (!cached) return null;
    if (!isCheckoutPrepareSessionCompatible(cached, appliedCouponCode)) return null;
    return cached;
  }, [appliedCouponCode, cartSignature, prepareSignature]);

  useEffect(() => {
    if (!prepareSignature || !cartSignature) return;
    if (
      previousPrepareSignatureRef.current &&
      previousPrepareSignatureRef.current !== prepareSignature
    ) {
      void queryClient.removeQueries({
        queryKey: checkoutKeys.prepare(previousPrepareSignatureRef.current),
      });
      clearCheckoutPrepareSessionsExcept(cartSignature);
    }
    previousPrepareSignatureRef.current = prepareSignature;
  }, [cartSignature, prepareSignature, queryClient]);

  useEffect(() => {
    if (previousCouponRef.current === appliedCouponCode) return;
    previousCouponRef.current = appliedCouponCode;
    if (cartSignature) {
      clearCheckoutPrepareSessionForCart(cartSignature);
    }
    if (!prepareSignature) return;
    void queryClient.invalidateQueries({
      queryKey: checkoutKeys.prepare(prepareSignature),
    });
  }, [appliedCouponCode, cartSignature, prepareSignature, queryClient]);

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
    // Read coupon from store so prepare/place always match the latest applied code,
    // even when invoked before React re-renders after setAppliedCouponCode.
    const couponCode = useRestaurantContextStore.getState().appliedCouponCode;
    return buildCheckoutPayload(
      lines,
      resolvedRestaurantId,
      contextToken,
      activeLocation,
      deliveryTimeSlot,
      couponCode,
    );
  }, [activeLocation, contextToken, coords, deliveryTimeSlot, lines, resolvedRestaurantId]);

  const prepareQuery = useQuery<CheckoutPrepareQueryData>({
    queryKey: checkoutKeys.prepare(prepareSignature ?? 'inactive'),
    queryFn: async ({ signal }) => {
      markPerf('checkout_prepare_start', 'checkout-page');
      const payload = getPayload();
      const response = await getMarketplaceApiClient().checkoutPrepare(payload, {
        signal,
        timeoutMs: CHECKOUT_PREPARE_TIMEOUT_MS,
      });
      markPerf('checkout_prepare_end', 'checkout-page');
      markPerf('checkout_bill_ready', 'checkout-page');
      if (prepareSignature && cartSignature) {
        persistCheckoutPrepareSession(prepareSignature, cartSignature, response);
      }
      if (resolvedRestaurantId && response.paymentMethods?.length) {
        persistKitchenPaymentMethods(resolvedRestaurantId, response.paymentMethods);
        useRestaurantContextStore.getState().setPaymentMethods(response.paymentMethods);
      }
      return cloneCheckoutPrepareForQuery(response);
    },
    enabled: canCheckout && Boolean(prepareSignature),
    staleTime: CHECKOUT_PREPARE_STALE_MS,
    gcTime: CHECKOUT_PREPARE_GC_MS,
    placeholderData: (previous, query) => {
      if (query?.queryKey[2] !== prepareSignature) return undefined;
      if (previous && isCheckoutPrepareSessionCompatible(
        { paymentMethods: previous.paymentMethods, quote: previous.quote, scheduling: previous.scheduling },
        appliedCouponCode,
      )) {
        return previous;
      }
      return sessionPrepare ? cloneCheckoutPrepareForQuery(sessionPrepare) : undefined;
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      if (error instanceof MarketplaceApiError) return error.retryable;
      return /network|fetch|timeout|reach/i.test(
        error instanceof Error ? error.message : String(error ?? ''),
      );
    },
    retryDelay: (attempt) => Math.min(1500, 350 * 2 ** attempt),
  });

  useEffect(() => {
    if (
      !prepareQuery.data ||
      !prepareSignature ||
      !cartSignature ||
      prepareQuery.isPlaceholderData ||
      prepareQuery.isFetching
    ) {
      return;
    }
    if (!isCheckoutPrepareSessionCompatible(prepareQuery.data, appliedCouponCode)) return;
    persistCheckoutPrepareSession(prepareSignature, cartSignature, prepareQuery.data);
  }, [
    appliedCouponCode,
    cartSignature,
    prepareQuery.data,
    prepareQuery.isFetching,
    prepareQuery.isPlaceholderData,
    prepareSignature,
  ]);

  useEffect(() => {
    if (!prepareQuery.isError || !cartSignature) return;
    // Keep last good quote/methods on transient network blips — only wipe on hard failures.
    const err = prepareQuery.error;
    const retryable =
      (err instanceof MarketplaceApiError && err.retryable) ||
      /network|fetch|timeout|reach|connection/i.test(
        err instanceof Error ? err.message : String(err ?? ''),
      );
    if (retryable) return;
    clearCheckoutPrepareSessionForCart(cartSignature);
  }, [cartSignature, prepareQuery.error, prepareQuery.isError]);

  useEffect(() => {
    if (
      !prepareQuery.data ||
      prepareQuery.isPlaceholderData ||
      prepareQuery.isFetching ||
      prepareQuery.isError ||
      !prepareSignature ||
      !cartSignature
    ) {
      return;
    }
    if (isCheckoutPrepareSessionCompatible(prepareQuery.data, appliedCouponCode)) {
      incompatiblePrepareRecoveryRef.current = null;
      return;
    }
    const recoveryKey = `${prepareSignature}:${appliedCouponCode ?? 'none'}:${prepareQuery.dataUpdatedAt}`;
    if (incompatiblePrepareRecoveryRef.current === recoveryKey) return;
    incompatiblePrepareRecoveryRef.current = recoveryKey;
    clearCheckoutPrepareSessionForCart(cartSignature);
    void queryClient.invalidateQueries({
      queryKey: checkoutKeys.prepare(prepareSignature),
    });
  }, [
    appliedCouponCode,
    cartSignature,
    prepareQuery.data,
    prepareQuery.dataUpdatedAt,
    prepareQuery.isError,
    prepareQuery.isFetching,
    prepareQuery.isPlaceholderData,
    prepareSignature,
    queryClient,
  ]);

  const hasFreshPrepare =
    prepareQuery.data != null &&
    !prepareQuery.isError &&
    isCheckoutPrepareSessionCompatible(prepareQuery.data, appliedCouponCode);
  const prepareData = hasFreshPrepare ? prepareQuery.data : null;
  const awaitingDiscountedQuote =
    Boolean(appliedCouponCode) &&
    !hasFreshPrepare &&
    Boolean(prepareSignature) &&
    (prepareQuery.isFetching || prepareQuery.isLoading);
  const quote = prepareData?.quote ?? null;
  const scheduling = prepareData?.scheduling ?? null;
  // Never blank the payment UI — live → query → session → restaurant store → kitchen memory → COD.
  const paymentMethods = (() => {
    const fromLive = prepareData?.paymentMethods;
    if (fromLive && fromLive.length > 0) return fromLive;
    const fromQuery = prepareQuery.data?.paymentMethods;
    if (fromQuery && fromQuery.length > 0) return fromQuery;
    const fromSession = sessionPrepare?.paymentMethods;
    if (fromSession && fromSession.length > 0) return fromSession;
    const fromStore = storePaymentMethods;
    if (fromStore && fromStore.length > 0) return fromStore;
    const fromKitchen = readKitchenPaymentMethods(resolvedRestaurantId);
    if (fromKitchen && fromKitchen.length > 0) return fromKitchen;
    return ['cod'] as string[];
  })();
  const quoteIsRefreshing = prepareQuery.isFetching && Boolean(quote) && !prepareQuery.isError;
  const quoteIsStale =
    Boolean(quote) && prepareQuery.isFetching && !prepareQuery.isError && hasFreshPrepare;
  const discountQuoteLoading =
    Boolean(appliedCouponCode) &&
    (awaitingDiscountedQuote || (prepareQuery.isFetching && !hasFreshPrepare));

  const prepareErrorMessage =
    prepareQuery.isError && prepareQuery.error instanceof Error
      ? /failed to fetch/i.test(prepareQuery.error.message)
        ? 'Couldn’t reach OrderBhojan servers. Check your connection and retry.'
        : prepareQuery.error.message
      : null;

  useEffect(() => {
    if (!scheduling?.deliverySlots?.length) return;
    // Voice set_delivery_schedule wins when present — strict match onto kitchen slots.
    if (voiceSchedulePref) {
      const resolved = tryResolveSlotFromScheduleAction(
        voiceSchedulePref,
        scheduling.deliverySlots,
        scheduling,
      );
      if (resolved.ok) {
        setDeliveryTimeSlot(resolved.slot);
      } else {
        useCheckoutScheduleStore.getState().setNotice({
          kind: 'error',
          message: resolved.message,
          reason: resolved.reason,
        });
      }
      return;
    }
    setDeliveryTimeSlot((current) => {
      if (scheduling.deliverySlots.includes(current)) return current;
      return resolveDefaultDeliverySlot(scheduling.deliverySlots);
    });
  }, [scheduling, voiceSchedulePref, voiceScheduleUpdatedAt]);

  const applyDeliveryTimeSlot = useCallback((slot: string) => {
    setDeliveryTimeSlot(slot);
    // Manual pick overrides voice preference / clarify notice.
    const store = useCheckoutScheduleStore.getState();
    if (store.preference || store.notice) {
      store.clear();
    }
  }, []);

  const status: CheckoutFlowStatus = useMemo(() => {
    if (placeStatus === 'placing') return 'placing';
    if (placeStatus === 'awaiting_payment') return 'awaiting_payment';
    if (placeStatus === 'success') return 'success';
    if (placeStatus === 'error') return 'error';
    if (prepareQuery.isError) return 'error';
    if (
      (prepareQuery.isFetching || awaitingDiscountedQuote) &&
      !quote &&
      !sessionPrepare
    ) {
      return 'preparing';
    }
    return 'idle';
  }, [
    awaitingDiscountedQuote,
    placeStatus,
    prepareQuery.isError,
    prepareQuery.isFetching,
    quote,
    sessionPrepare,
  ]);

  const error = placeError ?? prepareErrorMessage;

  useEffect(() => {
    if (quote?.grandTotal == null) return;
    obDebugTrustEvent(
      'checkout',
      'quote ready',
      { grandTotal: quote.grandTotal },
      { checkoutGrandTotal: quote.grandTotal },
    );
  }, [quote?.grandTotal]);

  const refreshQuote = useCallback(async () => {
    markPerf('checkout_prepare_start', 'refresh-quote');
    try {
      const payload = getPayload();
      const nextQuote = await getMarketplaceApiClient().quote(payload);
      if (prepareSignature) {
        const current = queryClient.getQueryData<CheckoutPrepareQueryData>(
          checkoutKeys.prepare(prepareSignature),
        );
        const nextPrepare: CheckoutPrepareQueryData = {
          paymentMethods: current?.paymentMethods ?? [],
          quote: nextQuote,
          scheduling: current?.scheduling,
        };
        const couponCode = useRestaurantContextStore.getState().appliedCouponCode;
        if (!isCheckoutPrepareSessionCompatible(nextPrepare, couponCode)) {
          throw new Error('Promo discount is not reflected in the latest quote. Try again.');
        }
        queryClient.setQueryData(checkoutKeys.prepare(prepareSignature), nextPrepare);
      }
      markPerf('checkout_bill_ready', 'refresh-quote');
    } catch (err) {
      setPlaceStatus('error');
      setPlaceError(err instanceof Error ? err.message : 'Unable to fetch quote');
    }
  }, [getPayload, prepareSignature, queryClient]);

  const prepareCheckout = useCallback(async () => {
    setPlaceError(null);
    if (placeStatus === 'error') setPlaceStatus('idle');
    await prepareQuery.refetch();
  }, [placeStatus, prepareQuery]);

  const placeCodOrder = useCallback(
    async (phone: string, customerName?: string, notificationEmail?: string) => {
      if (placeInFlightRef.current) return null;
      placeInFlightRef.current = true;
      markPerf('pay_tap', 'cod');
      setPlacingMethod('cod');
      setPlaceError(null);
      try {
        assertCanPlaceOrder();
        const resolvedEmail = notificationEmail?.trim().toLowerCase() || sessionUser?.email?.trim().toLowerCase() || null;
        const payload = {
          ...getPayload(),
          paymentMethod: 'cod',
          phone: phone.trim(),
          customerName: customerName?.trim() || undefined,
          userId: sessionUser?.uid ?? null,
          userEmail: resolvedEmail,
          notificationEmail: resolvedEmail,
        };

        // Optimistic success: transition immediately; revert on failure (cart stays intact until confirmed).
        setPlaceStatus('success');
        setOrderId('pending');
        setOrderNumber('Confirming…');
        markPerf('pay_next_step', 'cod-optimistic');

        const response = (await getMarketplaceApiClient().checkoutPlace(
          payload,
        )) as CheckoutPlaceResponse;
        const placed = resolvePlacedOrder(response);
        if (!placed) {
          throw new Error('Order confirmation is missing an order id');
        }
        setOrderId(placed.orderId);
        setOrderNumber(placed.orderNumber);
        markPerf('pay_next_step', 'cod-success');
        useCartStore.getState().clear();
        return placed;
      } catch (err) {
        setPlaceStatus('error');
        setOrderId(null);
        setOrderNumber(null);
        setPlaceError(err instanceof Error ? err.message : 'Unable to place order');
        return null;
      } finally {
        placeInFlightRef.current = false;
        setPlacingMethod(null);
      }
    },
    [assertCanPlaceOrder, getPayload, sessionUser],
  );

  const placeRazorpayOrder = useCallback(
    async (phone: string, customerName?: string, notificationEmail?: string) => {
      if (placeInFlightRef.current) return null;
      placeInFlightRef.current = true;
      markPerf('pay_tap', 'razorpay');
      setPlacingMethod('razorpay');
      setPlaceStatus('placing');
      setPlaceError(null);
      try {
        assertCanPlaceOrder();
        const resolvedEmail = notificationEmail?.trim().toLowerCase() || sessionUser?.email?.trim().toLowerCase() || null;
        const payload = {
          ...getPayload(),
          paymentMethod: 'razorpay',
          phone: phone.trim(),
          customerName: customerName?.trim() || undefined,
          userId: sessionUser?.uid ?? null,
          userEmail: resolvedEmail,
          notificationEmail: resolvedEmail,
        };
        const response = (await getMarketplaceApiClient().checkoutPlace(
          payload,
        )) as CheckoutPlaceResponse;
        const draftId = response.draftId ?? response.orderId;
        if (!draftId) {
          throw new Error('Payment session is missing a draft id');
        }

        const expectedPaise = Math.round((quote?.grandTotal ?? 0) * 100);
        const placeAmountPaise = response.amountInPaise;
        obDebugTrustEvent(
          'checkout',
          'placeRazorpayOrder before Razorpay',
          {
            quoteGrandTotal: quote?.grandTotal ?? null,
            expectedPaise,
            placeAmountPaise: placeAmountPaise ?? null,
            draftId: response.draftId ?? response.orderId ?? null,
          },
          {
            checkoutGrandTotal: quote?.grandTotal ?? null,
            razorpayAmountPaise: placeAmountPaise ?? expectedPaise,
          },
        );

        // Authoritative amount is what the place API stamped on the draft.
        const chargePaise =
          typeof placeAmountPaise === 'number' && placeAmountPaise > 0
            ? placeAmountPaise
            : expectedPaise;
        if (chargePaise <= 0) {
          throw new Error(
            'Payment amount is not ready yet. Wait for the total to update, then try again.',
          );
        }
        if (
          expectedPaise > 0 &&
          typeof placeAmountPaise === 'number' &&
          Math.abs(placeAmountPaise - expectedPaise) > 1
        ) {
          throw new Error(
            'Payment amount does not match your bill. Please refresh checkout and try again.',
          );
        }

        const confirmed = await runRazorpayCheckoutFlow({
          draftId,
          phone: phone.trim(),
          customerName: customerName?.trim() || sessionUser?.displayName || undefined,
          customerEmail: resolvedEmail ?? undefined,
          userId: sessionUser?.uid ?? null,
          orderNumber: response.orderNumber,
          expectedAmountPaise: chargePaise,
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
        const raw = err instanceof Error ? err.message : 'Unable to complete payment';
        setPlaceError(
          /failed to fetch|networkerror|load failed/i.test(raw)
            ? 'Couldn’t open Razorpay — check your connection and try again, or use UPI / cash on delivery.'
            : raw,
        );
        return null;
      } finally {
        placeInFlightRef.current = false;
        setPlacingMethod(null);
      }
    },
    [assertCanPlaceOrder, getPayload, quote?.grandTotal, sessionUser],
  );

  const finalizeUpiPaymentSuccess = useCallback((placed: PlacedOrderConfirmation) => {
    upiPollAbortRef.current?.abort();
    upiPollAbortRef.current = null;
    setUpiSession(null);
    setUpiVerifying(false);
    setUpiPollMessage(null);
    setOrderId(placed.orderId);
    setOrderNumber(placed.orderNumber);
    setPlaceStatus('success');
    markPerf('pay_next_step', 'upi-success');
    useCartStore.getState().clear();
  }, []);

  const runUpiVerification = useCallback(
    async (session: UpiPaymentSession, options?: { immediate?: boolean }) => {
      upiPollAbortRef.current?.abort();
      const controller = new AbortController();
      upiPollAbortRef.current = controller;
      setUpiVerifying(true);
      const platform = getUpiPlatform();
      const orderShortId = shortIdentifier(session.orderId);
      let pollAttempts = 0;
      logUpiDiag('verification-start', {
        platform,
        orderShortId,
        immediate: options?.immediate === true,
      });
      setPlaceError(null);
      setUpiPollMessage(
        options?.immediate
          ? 'Checking payment status…'
          : 'Waiting for payment confirmation…',
      );

      try {
        if (options?.immediate) {
          const snapshot = await fetchOrderPaymentSnapshot({
            orderId: session.orderId,
            phone: session.phone,
            isAuthenticated: Boolean(sessionUser?.uid),
          });
          logUpiDiag('snapshot', {
            immediate: true,
            orderShortId,
            paymentState: snapshot.paymentStatus,
          });
          if (['success', 'verified', 'paid'].includes(snapshot.paymentStatus.toLowerCase())) {
            finalizeUpiPaymentSuccess({
              orderId: session.orderId,
              orderNumber: session.orderNumber,
            });
            return;
          }
          if (['expired', 'failed'].includes(snapshot.paymentStatus.toLowerCase())) {
            throw new Error('Payment expired or failed. Please place a new order.');
          }
        }

        const result = await pollUpiPaymentStatus({
          orderId: session.orderId,
          phone: session.phone,
          isAuthenticated: Boolean(sessionUser?.uid),
          signal: controller.signal,
          onTick: (snapshot) => {
            pollAttempts += 1;
            setUpiPollMessage('Waiting for payment confirmation…');
            logUpiDiag('verify-attempt', {
              attempts: pollAttempts,
              orderShortId,
              paymentState: snapshot.paymentStatus,
            });
          },
        });

        logUpiDiag('verify-result', {
          platform,
          orderShortId,
          attempts: pollAttempts,
          result,
        });

        if (result === 'verified') {
          finalizeUpiPaymentSuccess({
            orderId: session.orderId,
            orderNumber: session.orderNumber,
          });
          return;
        }

        if (result === 'expired') {
          throw new Error('Payment window expired before confirmation. Please place a new order.');
        }

        setUpiPollMessage(
          'Payment not confirmed yet. Complete UPI payment on your phone, then tap “I have paid”.',
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        logUpiDiag('verify-error', {
          platform,
          orderShortId,
          attempts: pollAttempts,
          category: upiErrorCategory(err),
        });
        setPlaceError(err instanceof Error ? err.message : 'Unable to verify UPI payment');
        setUpiPollMessage(null);
      } finally {
        if (upiPollAbortRef.current === controller) {
          upiPollAbortRef.current = null;
        }
        setUpiVerifying(false);
      }
    },
    [finalizeUpiPaymentSuccess, sessionUser?.uid],
  );

  const placeUpiOrder = useCallback(
    async (phone: string, customerName?: string, notificationEmail?: string) => {
      if (placeInFlightRef.current) return null;
      placeInFlightRef.current = true;
      markPerf('pay_tap', 'upi');
      setPlacingMethod('upi');
      setPlaceStatus('placing');
      setPlaceError(null);
      setUpiPollMessage(null);
      try {
        assertCanPlaceOrder();
        const resolvedEmail = notificationEmail?.trim().toLowerCase() || sessionUser?.email?.trim().toLowerCase() || null;
        const payload = {
          ...getPayload(),
          paymentMethod: 'upi' as const,
          phone: phone.trim(),
          customerName: customerName?.trim() || undefined,
          userId: sessionUser?.uid ?? null,
          userEmail: resolvedEmail,
          notificationEmail: resolvedEmail,
        };
        const response = (await getMarketplaceApiClient().checkoutPlace(
          payload,
        )) as CheckoutPlaceResponse;
        const placed = resolvePlacedOrder(response);
        if (!placed) {
          throw new Error('Order confirmation is missing an order id');
        }
        if (!response.upiUrl) {
          throw new Error('UPI payment link is missing from the server response');
        }
        if (response.paymentStatus && response.paymentStatus !== 'pending') {
          throw new Error('Unexpected payment state from server');
        }

        const expectedPaise = Math.round((quote?.grandTotal ?? 0) * 100);
        const placeAmount = Number(response.amount ?? quote?.grandTotal ?? 0);
        const placeAmountPaise =
          typeof response.amountInPaise === 'number'
            ? response.amountInPaise
            : Math.round(placeAmount * 100);
        if (
          !Number.isFinite(placeAmount) ||
          placeAmount <= 0 ||
          (expectedPaise > 0 && placeAmountPaise !== expectedPaise)
        ) {
          throw new Error(
            'Order total changed before UPI payment started. Please refresh checkout and try again.',
          );
        }

        const session: UpiPaymentSession = {
          orderId: placed.orderId,
          orderNumber: placed.orderNumber,
          upiUrl: response.upiUrl,
          amount: placeAmount,
          expiresAt: response.expiresAt,
          phone: phone.trim(),
        };

        // Keep cart until UPI is verified or customer claims payment (avoids empty-cart trap on abandon).
        setOrderId(placed.orderId);
        setOrderNumber(placed.orderNumber);
        setUpiSession(session);
        setPlaceStatus('awaiting_payment');
        markPerf('pay_next_step', 'upi-pending');
        void runUpiVerification(session);
        return placed;
      } catch (err) {
        setPlaceStatus('error');
        setPlaceError(err instanceof Error ? err.message : 'Unable to start UPI payment');
        return null;
      } finally {
        placeInFlightRef.current = false;
        setPlacingMethod(null);
      }
    },
    [assertCanPlaceOrder, getPayload, quote?.grandTotal, runUpiVerification, sessionUser],
  );

  const checkUpiPayment = useCallback(async () => {
    if (!upiSession) return;
    await runUpiVerification(upiSession, { immediate: true });
  }, [runUpiVerification, upiSession]);

  const notifyKitchenUpiPaid = useCallback(
    async (upiReference?: string) => {
      if (!upiSession) {
        throw new Error('Payment session is missing');
      }
      await claimCustomerUpiPayment({
        orderId: upiSession.orderId,
        phone: upiSession.phone,
        upiReference,
      });
      useCartStore.getState().clear();
      setUpiPollMessage('Kitchen notified — waiting for them to verify your payment…');
    },
    [upiSession],
  );

  useEffect(() => {
    if (placeStatus !== 'awaiting_payment' || !upiSession) return;

    const resumePolling = () => {
      if (document.visibilityState === 'visible' && !upiVerifying) {
        void runUpiVerification(upiSession, { immediate: true });
      }
    };

    document.addEventListener('visibilitychange', resumePolling);
    return () => {
      document.removeEventListener('visibilitychange', resumePolling);
    };
  }, [placeStatus, runUpiVerification, upiSession, upiVerifying]);

  useEffect(
    () => () => {
      upiPollAbortRef.current?.abort();
    },
    [],
  );

  const reset = useCallback(() => {
    upiPollAbortRef.current?.abort();
    upiPollAbortRef.current = null;
    placeInFlightRef.current = false;
    setPlacingMethod(null);
    setPlaceStatus('idle');
    setPlaceError(null);
    setOrderId(null);
    setOrderNumber(null);
    setUpiSession(null);
    setUpiVerifying(false);
    setUpiPollMessage(null);
    setDeliveryTimeSlot('ASAP');
    useCheckoutScheduleStore.getState().clear();
    if (prepareSignature) {
      void queryClient.removeQueries({ queryKey: checkoutKeys.prepare(prepareSignature) });
    }
  }, [prepareSignature, queryClient]);

  return {
    quote,
    scheduling,
    deliveryTimeSlot,
    paymentMethods,
    status,
    error,
    orderId,
    orderNumber,
    upiSession,
    upiVerifying,
    upiPollMessage,
    itemCount,
    canCheckout,
    placingMethod,
    quoteIsRefreshing,
    quoteIsStale,
    discountQuoteLoading,
    cartSyncMessages,
    appliedCouponCode,
    setAppliedCouponCode,
    voiceScheduleNotice,
    setDeliveryTimeSlot: applyDeliveryTimeSlot,
    refreshQuote,
    prepareCheckout,
    placeCodOrder,
    placeRazorpayOrder,
    placeUpiOrder,
    checkUpiPayment,
    notifyKitchenUpiPaid,
    reset,
  };
}
