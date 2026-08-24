import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocationStoreAddress, subscribeLocationStore } from '@bhojan/location-core';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { CheckoutPageView } from '@bhojan/storefront-design-system/cart/CheckoutPageView';
import type { CheckoutPaymentMethodId } from '@bhojan/storefront-design-system/cart/CheckoutPageView';
import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import { phoneNumberSchema } from '@/features/auth/domain/auth.types';
import {
  hasActiveDeliveryLocation,
  needsFlatConfirmation,
  useActiveLocation,
  useLocationActions,
  useLocationFeatureEnabled,
  useLocationUiState,
} from '@/features/location';
import { cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCheckoutFlow } from '@/features/checkout/hooks/useCheckoutFlow';
import { useCheckoutPrefetch } from '@/features/checkout/hooks/useCheckoutPrefetch';
import { useCheckoutPromoOffers } from '@/features/checkout/hooks/useCheckoutPromoOffers';
import { useKitchenPaymentMethodsPrefetch } from '@/features/checkout/hooks/useKitchenPaymentMethodsPrefetch';
import { prefetchRazorpayCheckoutScript } from '@/features/checkout/infrastructure/razorpayCheckout';
import { UpiPaymentPendingView } from '@/presentation/checkout/UpiPaymentPendingView';
import { OrderBhojanCheckoutSuccessView } from '@/presentation/checkout/OrderBhojanCheckoutSuccessView';
import { CheckoutAuthGateView } from '@/presentation/checkout/CheckoutAuthGateView';
import {
  formatBillDeliveryScheduleLine,
  formatCheckoutDeliveryAddress,
  formatTrustPanelDeliverySchedule,
} from '@/features/checkout/domain/checkoutDeliveryDisplay';
import { markPerf } from '@/lib/perfMarks';
import { resolveCheckoutAuthGate } from '@/features/auth/domain/checkoutAuth';
import {
  ensureScheduledDeliverySlots,
  formatDeliverySlotLabel,
  isAsapSlot,
} from '@/features/checkout/domain/deliveryTimeSlots';
import { PRICING_TRUST } from '@/features/experience/domain/pricingTrustCopy';

const DELIVERY_ADDRESS_PLACEHOLDER = 'Set your delivery area';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhoneFromSession(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export function OrderBhojanCheckoutPage() {
  const navigate = useNavigate();
  const { sessionUser, status: authStatus } = useAuth();
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const { uiStatus } = useLocationUiState();
  const { openSelector, openConfirmation } = useLocationActions();
  const {
    quote,
    scheduling,
    deliveryTimeSlot,
    setDeliveryTimeSlot,
    voiceScheduleNotice,
    paymentMethods,
    status,
    error,
    orderId,
    orderNumber,
    itemCount,
    canCheckout,
    placeCodOrder,
    placeRazorpayOrder,
    placeUpiOrder,
    placingMethod,
    quoteIsRefreshing,
    quoteIsStale,
    discountQuoteLoading,
    cartSyncMessages,
    appliedCouponCode,
    setAppliedCouponCode,
    localDeliveryFeeEstimate,
    deliverySlotStatus,
    upiSession,
    upiVerifying,
    upiPollMessage,
    checkUpiPayment,
    notifyKitchenUpiPaid,
    prepareCheckout,
  } = useCheckoutFlow();
  useCheckoutPrefetch(canCheckout);
  useKitchenPaymentMethodsPrefetch(canCheckout);
  const { selectableCodes } = useCheckoutPromoOffers(canCheckout);

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoApplying, setPromoApplying] = useState(false);

  useEffect(() => {
    if (appliedCouponCode) {
      setPromoInput(appliedCouponCode);
    }
  }, [appliedCouponCode]);

  useEffect(() => {
    if (!error || !appliedCouponCode) return;
    if (/promo code|coupon|minimum order/i.test(error)) {
      setPromoError(error);
    }
  }, [appliedCouponCode, error]);

  useEffect(() => {
    if (appliedCouponCode || selectableCodes.length === 0) return;
    const primaryCode = selectableCodes[0]?.code;
    if (!primaryCode) return;
    setPromoInput(primaryCode);
  }, [appliedCouponCode, selectableCodes]);

  useEffect(() => {
    if (!promoApplying || discountQuoteLoading) return;
    setPromoApplying(false);
  }, [discountQuoteLoading, promoApplying]);

  const checkoutAuthGate = resolveCheckoutAuthGate({ status: authStatus, sessionUser });

  const lines = useCartStore((s) => s.lines);
  const cartHydrated = useCartStore((s) => s._hasHydrated);
  const estimatedSubtotal = cartSubtotal(lines);

  const sessionPhone = normalizePhoneFromSession(sessionUser?.phoneNumber);
  const sessionEmail = sessionUser?.email?.trim().toLowerCase() || '';
  const [phoneOverride, setPhoneOverride] = useState('');
  const [emailOverride, setEmailOverride] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const phone = phoneOverride || sessionPhone;
  const notificationEmail = sessionEmail || emailOverride.trim().toLowerCase() || undefined;
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cod' | 'razorpay' | 'upi' | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethodId | null>(null);

  const isPreparing = status === 'preparing';
  const isPlacing = status === 'placing';
  const billRefreshing = quoteIsRefreshing && !discountQuoteLoading;
  const quoteReady = Boolean(quote);
  // Keep pay tappable once we have an estimated bill; place handlers still require authoritative quote.
  const checkoutActionsDisabled =
    isPlacing ||
    (Boolean(error) && !/reach|network|fetch|timeout|connection/i.test(error ?? '')) ||
    (!quoteReady && estimatedSubtotal <= 0);
  const supportsCod = paymentMethods.includes('cod');
  const supportsRazorpay = paymentMethods.includes('razorpay');
  const supportsUpi = paymentMethods.includes('upi');
  // Show every kitchen-enabled method — UPI (owner VPA) must stay visible even when Razorpay exists.
  const paymentOptions = useMemo(() => {
    const options: {
      id: CheckoutPaymentMethodId;
      title: string;
      subtitle: string;
      badge?: string;
    }[] = [];
    if (supportsUpi) {
      options.push({
        id: 'upi',
        title: 'Pay via UPI',
        subtitle: 'Opens GPay, PhonePe or Paytm with this kitchen’s UPI ID',
        badge: 'Recommended',
      });
    }
    if (supportsCod) {
      options.push({
        id: 'cod',
        title: 'Pay on delivery',
        subtitle: 'Pay cash when your order arrives',
      });
    }
    if (supportsRazorpay) {
      options.push({
        id: 'razorpay',
        title: 'Pay online',
        subtitle: 'Cards, net banking & UPI via Razorpay',
      });
    }
    return options;
  }, [supportsCod, supportsRazorpay, supportsUpi]);

  useEffect(() => {
    if (paymentOptions.length === 0) {
      setSelectedPaymentMethod(null);
      return;
    }
    setSelectedPaymentMethod((current) => {
      if (current && paymentOptions.some((option) => option.id === current)) return current;
      return paymentOptions[0]!.id;
    });
  }, [paymentOptions]);

  const hasDeliveryLocation = hasActiveDeliveryLocation(activeLocation);
  const requiresFlatConfirmation = needsFlatConfirmation(activeLocation);
  const [v2Address, setV2Address] = useState(() => getLocationStoreAddress());

  useEffect(() => subscribeLocationStore(setV2Address), []);

  const paymentSubtitle = useMemo(() => {
    if (paymentOptions.length > 1) return 'Choose how you want to pay';
    if (supportsUpi) return 'Pay via kitchen UPI';
    if (supportsRazorpay) return 'Pay online securely';
    return 'Cash on delivery';
  }, [paymentOptions.length, supportsRazorpay, supportsUpi]);

  const paymentHint = useMemo(() => {
    const trust = PRICING_TRUST.checkoutHint;
    if (supportsUpi) {
      return `${trust} UPI opens your installed app with the kitchen’s registered UPI ID — no manual entry.`;
    }
    if (supportsRazorpay && supportsCod) {
      return `${trust} Pay online or choose cash on delivery.`;
    }
    if (supportsCod) {
      return `${trust} Pay with cash when your order arrives.`;
    }
    return trust;
  }, [supportsCod, supportsRazorpay, supportsUpi]);

  useEffect(() => {
    markPerf('cart_to_checkout');
  }, []);

  useEffect(() => {
    if (supportsRazorpay) {
      prefetchRazorpayCheckoutScript();
    }
  }, [supportsRazorpay]);

  const validatePhone = (): boolean => {
    const parsed = phoneNumberSchema.safeParse(phone.trim());
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message ?? 'Enter a valid mobile number');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const validateEmail = (): boolean => {
    if (sessionEmail || !emailOverride.trim()) {
      setEmailError(null);
      return true;
    }
    const normalized = emailOverride.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      setEmailError('Enter a valid email address or leave blank');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handlePlaceCod = async () => {
    if (isPlacing) return;
    if (!validatePhone() || !validateEmail()) return;
    setLastPaymentMethod('cod');
    await placeCodOrder(phone.trim(), sessionUser?.displayName ?? undefined, notificationEmail);
  };

  const handlePlaceRazorpay = async () => {
    if (isPlacing) return;
    if (!validatePhone() || !validateEmail()) return;
    setLastPaymentMethod('razorpay');
    await placeRazorpayOrder(phone.trim(), sessionUser?.displayName ?? undefined, notificationEmail);
  };

  const handlePlaceUpi = async () => {
    if (isPlacing) return;
    if (!validatePhone() || !validateEmail()) return;
    setLastPaymentMethod('upi');
    await placeUpiOrder(phone.trim(), sessionUser?.displayName ?? undefined, notificationEmail);
  };

  const placeOrderLabel = useMemo(() => {
    if (error && /reach|network|fetch|timeout|connection/i.test(error)) {
      return 'Retry checkout';
    }
    const estimatedTotal = estimatedSubtotal + (localDeliveryFeeEstimate ?? 0);
    const total = quote ? `₹${quote.grandTotal}` : `₹${estimatedTotal}`;
    if (!quoteReady && estimatedSubtotal > 0) {
      if (selectedPaymentMethod === 'upi') return `Pay ~${total} via UPI`;
      if (selectedPaymentMethod === 'razorpay') return `Pay ~${total} online`;
      if (selectedPaymentMethod === 'cod') return `Place order · ~${total}`;
      return `Continue · ~${total}`;
    }
    if (!quoteReady) return 'Updating total…';
    if (selectedPaymentMethod === 'upi') return `Pay ${total} via UPI`;
    if (selectedPaymentMethod === 'razorpay') return `Pay ${total} online`;
    if (selectedPaymentMethod === 'cod') return `Place order · ${total}`;
    return `Continue · ${total}`;
  }, [error, estimatedSubtotal, localDeliveryFeeEstimate, quote, quoteReady, selectedPaymentMethod]);

  const handlePlaceOrder = () => {
    if (error && /reach|network|fetch|timeout|connection/i.test(error)) {
      void prepareCheckout();
      return;
    }
    if (!selectedPaymentMethod) return;
    if (selectedPaymentMethod === 'upi') {
      void handlePlaceUpi();
      return;
    }
    if (selectedPaymentMethod === 'razorpay') {
      void handlePlaceRazorpay();
      return;
    }
    void handlePlaceCod();
  };

  if (!checkoutAuthGate.allowed && authStatus !== 'loading') {
    return <CheckoutAuthGateView />;
  }

  const deliveryAddressLabel = formatCheckoutDeliveryAddress(activeLocation, v2Address);
  const estimatedDeliveryLabel = formatTrustPanelDeliverySchedule({
    deliveryTimeSlot,
    voiceScheduleNotice,
  });

  if (status === 'awaiting_payment' && upiSession) {
    return (
      <UpiPaymentPendingView
        orderId={upiSession.orderId}
        orderNumber={upiSession.orderNumber}
        deliveryAddress={deliveryAddressLabel}
        estimatedDelivery={estimatedDeliveryLabel}
        phone={upiSession.phone}
        amount={upiSession.amount}
        upiUrl={upiSession.upiUrl}
        expiresAt={upiSession.expiresAt}
        verifying={upiVerifying}
        pollMessage={upiPollMessage}
        errorMessage={error}
        onCheckPayment={() => void checkUpiPayment()}
        onNotifyKitchen={(upiReference) => notifyKitchenUpiPaid(upiReference)}
        onTrack={() => navigate(`/orders/${upiSession.orderId}/track`)}
        onBrowse={() => navigate('/')}
      />
    );
  }

  if (orderId && status === 'success') {
    const isRazorpayPayment = lastPaymentMethod === 'razorpay';
    const isUpiPayment = lastPaymentMethod === 'upi';
    const isCodConfirming = lastPaymentMethod === 'cod' && orderId === 'pending';
    const orderLabel = orderNumber ?? orderId;
    const paymentNote = isCodConfirming
      ? 'Confirming cash on delivery with the kitchen.'
      : isRazorpayPayment
        ? 'Online payment confirmed.'
        : isUpiPayment
          ? 'UPI payment confirmed.'
          : 'Pay with cash when your order arrives.';
    return (
      <OrderBhojanCheckoutSuccessView
        orderId={isCodConfirming ? 'pending' : orderId}
        orderNumber={orderLabel}
        deliveryAddress={deliveryAddressLabel}
        estimatedDelivery={estimatedDeliveryLabel}
        confirming={isCodConfirming}
        paymentNote={paymentNote}
        onTrack={() => navigate(`/orders/${orderId}/track`)}
        onBrowse={() => navigate('/')}
      />
    );
  }

  // Wait for cart hydration before showing "Nothing to checkout" to avoid race on first load.
  if (!cartHydrated) {
    return (
      <TransactionalPageShell title="Checkout" subtitle="" embedded>
        <MarketplaceUxStateView
          loading
          loadingMessage="Restoring your cart…"
          title="Restoring your cart"
        />
      </TransactionalPageShell>
    );
  }

  if (itemCount === 0) {
    return (
      <TransactionalPageShell title="Checkout" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Nothing to checkout"
          description="Add dishes from a restaurant menu before checking out."
          primaryLabel="Browse restaurants"
          onPrimary={() => navigate('/')}
        />
      </TransactionalPageShell>
    );
  }

  if (locationEnabled && !hasDeliveryLocation) {
    return (
      <TransactionalPageShell title="Checkout" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Set your delivery area"
          description="Add your delivery address to complete checkout."
          primaryLabel="Add address"
          onPrimary={() => openSelector()}
        />
      </TransactionalPageShell>
    );
  }

  if (locationEnabled && requiresFlatConfirmation) {
    return (
      <TransactionalPageShell title="Checkout" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Confirm delivery address"
          description="Add your flat or house number to complete checkout."
          primaryLabel="Confirm address"
          onPrimary={() => openConfirmation()}
        />
      </TransactionalPageShell>
    );
  }

  if (!canCheckout) {
    return (
      <TransactionalPageShell title="Checkout" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Session expired"
          description="Open the restaurant menu again to refresh checkout context."
          primaryLabel="Go to cart"
          onPrimary={() => navigate('/cart')}
        />
      </TransactionalPageShell>
    );
  }

  const handleAddressAction = () => {
    openSelector();
  };

  const addressLabel =
    uiStatus === 'loading'
      ? 'Detecting location…'
      : v2Address?.text?.shortLabel?.trim() || activeLocation?.displayLabel || DELIVERY_ADDRESS_PLACEHOLDER;

  const billDeliveryLine = formatBillDeliveryScheduleLine({
    deliveryTimeSlot,
    voiceScheduleNotice,
  });

  const billView = quote
    ? {
        lines: [
          ...quote.lineItems.map((item) => ({
            label: item.label,
            amountLabel:
              item.amount < 0 ? `-₹${Math.abs(item.amount)}` : `₹${item.amount}`,
          })),
          ...(quote.discountAmount > 0 &&
          !quote.lineItems.some((item) => item.label.startsWith('Discount'))
            ? [
                {
                  label: appliedCouponCode ? `Discount (${appliedCouponCode})` : 'Discount',
                  amountLabel: `-₹${quote.discountAmount}`,
                },
              ]
            : []),
          ...(billDeliveryLine ? [billDeliveryLine] : []),
        ],
        totalLabel: `₹${quote.grandTotal}`,
        deliveryPendingNote: quote.deliveryPending
          ? 'Delivery fee pending address confirmation'
          : quoteIsStale || quoteIsRefreshing
            ? 'Updating taxes and delivery for your address…'
            : undefined,
      }
    : estimatedSubtotal > 0
      ? {
          lines: [
            { label: 'Subtotal (estimated)', amountLabel: `₹${estimatedSubtotal}` },
            ...(localDeliveryFeeEstimate != null
              ? [{ label: 'Delivery fee (estimated)', amountLabel: `₹${localDeliveryFeeEstimate}` }]
              : []),
            ...(appliedCouponCode
              ? [
                  {
                    label: `Discount (${appliedCouponCode})`,
                    amountLabel: discountQuoteLoading ? 'Calculating…' : 'Pending',
                  },
                ]
              : []),
            ...(billDeliveryLine ? [billDeliveryLine] : []),
          ],
          totalLabel: `₹${estimatedSubtotal + (localDeliveryFeeEstimate ?? 0)}`,
          deliveryPendingNote:
            isPreparing || discountQuoteLoading
              ? 'Updating taxes and delivery…'
              : localDeliveryFeeEstimate != null
              ? 'Estimated — final total updates when ready'
              : 'Estimated — delivery fee will be confirmed',
        }
      : undefined;

  const checkoutMessages = [
    ...cartSyncMessages,
    ...(error ? [error] : []),
  ];
  const errorMessage = checkoutMessages.length > 0 ? checkoutMessages.join(' ') : undefined;

  const showQuoteSkeleton = isPreparing && !billView;

  const handleApplyPromo = () => {
    const normalized = promoInput.trim().toUpperCase();
    if (!normalized) return;
    const knownCode = selectableCodes.find((entry) => entry.code === normalized);
    if (selectableCodes.length > 0 && !knownCode) {
      setPromoError('This code is not available for this kitchen');
      return;
    }
    setPromoApplying(true);
    setPromoError(null);
    setAppliedCouponCode(normalized);
    setPromoInput(normalized);
  };

  const handleSelectPromoChip = (code: string) => {
    setPromoError(null);
    setPromoInput(code);
    setAppliedCouponCode(code);
    setPromoApplying(true);
  };

  const handleClearPromo = () => {
    setPromoError(null);
    setPromoInput('');
    setAppliedCouponCode(null);
    setPromoApplying(true);
  };

  const promoView =
    selectableCodes.length > 0
      ? {
          value: promoInput,
          appliedCode: appliedCouponCode ?? undefined,
          chips: selectableCodes.map((entry) => ({
            code: entry.code,
            label: entry.discountLabel,
            minOrder: entry.minOrder > 0 ? entry.minOrder : undefined,
          })),
          hint: 'Tap a code to apply instantly — discount updates in your bill',
          error: promoError ?? undefined,
          busy: promoApplying,
        }
      : undefined;

  const deliverySlotView = scheduling
    ? {
        // Pass authoritative slots only (no fabrication). UI renders based on deliverySlotStatus.
        slots: ensureScheduledDeliverySlots(scheduling.deliverySlots),
        selectedSlot: deliveryTimeSlot,
        selectedIsAsap: isAsapSlot(deliveryTimeSlot),
        selectedSummary: isAsapSlot(deliveryTimeSlot)
          ? undefined
          : deliveryTimeSlot.replace(/^(Today|Tomorrow), /, '$1 · '),
        closedMessage: scheduling.closedMessage,
        ...(voiceScheduleNotice
          ? {
              voiceScheduleNotice: voiceScheduleNotice.message,
              voiceScheduleNoticeKind: voiceScheduleNotice.kind,
            }
          : {}),
        isAsap: isAsapSlot,
        formatLabel: formatDeliverySlotLabel,
        // Explicit delivery slot status for proper UI state management
        status: deliverySlotStatus,
      }
    : undefined;

  return (
    <CheckoutPageView
      title="Checkout"
      subtitle={`${itemCount} item${itemCount === 1 ? '' : 's'} · ${paymentSubtitle}`}
      address={
        locationEnabled
          ? {
              label: 'Deliver to',
              value: addressLabel,
              loading: uiStatus === 'loading' && !activeLocation,
              actionLabel: activeLocation ? 'Change' : 'Add address',
            }
          : undefined
      }
      onAddressAction={locationEnabled ? handleAddressAction : undefined}
      deliverySlot={deliverySlotView}
      onDeliverySlotChange={setDeliveryTimeSlot}
      bill={billView}
      quoteLoading={showQuoteSkeleton}
      billRefreshing={billRefreshing}
      promo={promoView}
      onPromoChange={(value) => {
        setPromoInput(value);
        if (promoError) setPromoError(null);
      }}
      onPromoApply={handleApplyPromo}
      onPromoSelectChip={handleSelectPromoChip}
      onPromoClear={appliedCouponCode ? handleClearPromo : undefined}
      contact={{
        value: phone,
        error: phoneError ?? undefined,
        hint: 'Required for order updates and delivery coordination',
        emailValue: sessionEmail ? sessionEmail : emailOverride,
        emailHint: sessionEmail
          ? 'Order updates will be sent to your signed-in email'
          : 'Optional — recommended for email order updates',
        emailError: emailError ?? undefined,
      }}
      onContactChange={(value) => {
        setPhoneOverride(value);
        if (phoneError) setPhoneError(null);
      }}
      onContactEmailChange={
        sessionEmail
          ? undefined
          : (value) => {
              setEmailOverride(value);
              if (emailError) setEmailError(null);
            }
      }
      errorMessage={errorMessage}
      backLabel="Back to cart"
      onBack={() => navigate('/cart')}
      paymentOptions={paymentOptions}
      selectedPaymentMethod={selectedPaymentMethod}
      onSelectPaymentMethod={setSelectedPaymentMethod}
      placeOrderLabel={placeOrderLabel}
      placeOrderBusy={placingMethod != null}
      onPlaceOrder={handlePlaceOrder}
      actionsDisabled={
        Boolean(error && /reach|network|fetch|timeout|connection/i.test(error))
          ? false
          : checkoutActionsDisabled
      }
      hint={paymentHint}
      paymentMethodsLoading={isPreparing && paymentOptions.length === 0}
    />
  );
}
