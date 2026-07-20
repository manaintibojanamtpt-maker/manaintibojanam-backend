import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocationStoreAddress, subscribeLocationStore } from '@bhojan/location-core';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { CheckoutPageView } from '@bhojan/storefront-design-system/cart/CheckoutPageView';
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
import { prefetchRazorpayCheckoutScript } from '@/features/checkout/infrastructure/razorpayCheckout';
import { UpiPaymentPendingView } from '@/presentation/checkout/UpiPaymentPendingView';
import { OrderBhojanCheckoutSuccessView } from '@/presentation/checkout/OrderBhojanCheckoutSuccessView';
import { CheckoutAuthGateView } from '@/presentation/checkout/CheckoutAuthGateView';
import {
  formatCheckoutDeliveryAddress,
  formatCheckoutEstimatedDelivery,
} from '@/features/checkout/domain/checkoutDeliveryDisplay';
import { markPerf } from '@/lib/perfMarks';
import { resolveCheckoutAuthGate } from '@/features/auth/domain/checkoutAuth';
import {
  formatDeliverySlotLabel,
  isAsapSlot,
} from '@/features/checkout/domain/deliveryTimeSlots';

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
    cartSyncMessages,
    appliedCouponCode,
    setAppliedCouponCode,
    upiSession,
    upiVerifying,
    upiPollMessage,
    checkUpiPayment,
    notifyKitchenUpiPaid,
  } = useCheckoutFlow();
  useCheckoutPrefetch(canCheckout);
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
    if (!promoApplying || quoteIsRefreshing) return;
    setPromoApplying(false);
  }, [promoApplying, quoteIsRefreshing]);

  const checkoutAuthGate = resolveCheckoutAuthGate({ status: authStatus, sessionUser });

  const lines = useCartStore((s) => s.lines);
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

  const isPreparing = status === 'preparing';
  const isPlacing = status === 'placing';
  const billRefreshing = quoteIsRefreshing || (quoteIsStale && isPreparing);
  const checkoutActionsDisabled = isPlacing || !quote || Boolean(error);
  const supportsCod = paymentMethods.includes('cod');
  const supportsRazorpay = paymentMethods.includes('razorpay');
  const supportsUpi = paymentMethods.includes('upi');
  const showRazorpayButton = supportsRazorpay;
  const showUpiButton = supportsUpi && !supportsRazorpay;
  const showBothPaymentOptions = (showRazorpayButton || showUpiButton) && supportsCod;
  const hasDeliveryLocation = hasActiveDeliveryLocation(activeLocation);
  const requiresFlatConfirmation = needsFlatConfirmation(activeLocation);
  const [v2Address, setV2Address] = useState(() => getLocationStoreAddress());

  useEffect(() => subscribeLocationStore(setV2Address), []);

  const paymentSubtitle = useMemo(() => {
    if (showBothPaymentOptions) return 'Choose how you want to pay';
    if (showRazorpayButton) return 'Pay online securely';
    if (showUpiButton) return 'Pay via UPI';
    return 'Cash on delivery';
  }, [showBothPaymentOptions, showRazorpayButton, showUpiButton]);

  const paymentHint = useMemo(() => {
    if (supportsCod && !showBothPaymentOptions) {
      return 'Pay with cash when your order arrives.';
    }
    if (showUpiButton) {
      return 'Opens GPay, PhonePe, or Paytm with the kitchen UPI ID pre-filled.';
    }
    if (showRazorpayButton && showBothPaymentOptions) {
      return 'Pay online with UPI, cards, or net banking. COD remains available if you prefer cash on delivery.';
    }
    return undefined;
  }, [showBothPaymentOptions, showRazorpayButton, showUpiButton, supportsCod]);

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

  if (!checkoutAuthGate.allowed && authStatus !== 'loading') {
    return <CheckoutAuthGateView />;
  }

  const deliveryAddressLabel = formatCheckoutDeliveryAddress(activeLocation, v2Address);
  const estimatedDeliveryLabel = formatCheckoutEstimatedDelivery(deliveryTimeSlot, scheduling);

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

  if (itemCount === 0) {
    return (
      <TransactionalPageShell title="Checkout" subtitle="">
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
      <TransactionalPageShell title="Checkout" subtitle="">
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
      <TransactionalPageShell title="Checkout" subtitle="">
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
      <TransactionalPageShell title="Checkout" subtitle="">
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
          ...(deliveryTimeSlot && !isAsapSlot(deliveryTimeSlot)
            ? [{ label: 'Delivery slot', amountLabel: formatDeliverySlotLabel(deliveryTimeSlot) }]
            : []),
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
            ...(appliedCouponCode
              ? [
                  {
                    label: `Discount (${appliedCouponCode})`,
                    amountLabel: isPreparing || quoteIsRefreshing ? 'Calculating…' : 'Pending',
                  },
                ]
              : []),
          ],
          totalLabel:
            appliedCouponCode && (isPreparing || quoteIsRefreshing)
              ? 'Calculating…'
              : `₹${estimatedSubtotal}`,
          deliveryPendingNote:
            isPreparing || (appliedCouponCode && !quote)
              ? 'Calculating taxes and delivery…'
              : undefined,
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
          busy: promoApplying || quoteIsRefreshing,
        }
      : undefined;

  const deliverySlotView =
    scheduling && scheduling.deliverySlots.length > 0
      ? {
          slots: scheduling.deliverySlots,
          selectedSlot: deliveryTimeSlot,
          selectedIsAsap: isAsapSlot(deliveryTimeSlot),
          selectedSummary: isAsapSlot(deliveryTimeSlot)
            ? undefined
            : deliveryTimeSlot.replace(/^(Today|Tomorrow), /, '$1 · '),
          closedMessage: scheduling.closedMessage,
          isAsap: isAsapSlot,
          formatLabel: formatDeliverySlotLabel,
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
      codLabel="Pay on delivery"
      razorpayLabel={showUpiButton ? 'Pay via UPI' : 'Pay online'}
      codBusy={placingMethod === 'cod'}
      razorpayBusy={placingMethod === 'razorpay' || placingMethod === 'upi'}
      showCod={supportsCod}
      showRazorpay={showRazorpayButton || showUpiButton}
      actionsDisabled={checkoutActionsDisabled}
      hint={paymentHint}
      onPlaceCod={supportsCod ? () => void handlePlaceCod() : undefined}
      onPlaceRazorpay={
        showRazorpayButton
          ? () => void handlePlaceRazorpay()
          : showUpiButton
            ? () => void handlePlaceUpi()
            : undefined
      }
    />
  );
}
