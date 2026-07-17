import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocationStoreAddress, subscribeLocationStore } from '@bhojan/location-core';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import {
  CheckoutPageView,
  CheckoutSuccessView,
} from '@bhojan/storefront-design-system/cart/CheckoutPageView';
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
import { prefetchRazorpayCheckoutScript } from '@/features/checkout/infrastructure/razorpayCheckout';
import { markPerf } from '@/lib/perfMarks';

const DELIVERY_ADDRESS_PLACEHOLDER = 'Set delivery location';

function normalizePhoneFromSession(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export function OrderBhojanCheckoutPage() {
  const navigate = useNavigate();
  const { sessionUser } = useAuth();
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const { uiStatus } = useLocationUiState();
  const { openSelector, openConfirmation } = useLocationActions();
  const {
    quote,
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
  } = useCheckoutFlow();
  useCheckoutPrefetch(canCheckout);

  const lines = useCartStore((s) => s.lines);
  const estimatedSubtotal = cartSubtotal(lines);

  const sessionPhone = normalizePhoneFromSession(sessionUser?.phoneNumber);
  const [phoneOverride, setPhoneOverride] = useState('');
  const phone = phoneOverride || sessionPhone;
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cod' | 'razorpay' | 'upi' | null>(null);

  const isPreparing = status === 'preparing';
  const isPlacing = status === 'placing';
  const isBusy = isPreparing || isPlacing;
  const billRefreshing = isPreparing && Boolean(quote);
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

  const handlePlaceCod = async () => {
    if (isPlacing) return;
    if (!validatePhone()) return;
    setLastPaymentMethod('cod');
    await placeCodOrder(phone.trim(), sessionUser?.displayName ?? undefined);
  };

  const handlePlaceRazorpay = async () => {
    if (isPlacing) return;
    if (!validatePhone()) return;
    setLastPaymentMethod('razorpay');
    await placeRazorpayOrder(phone.trim(), sessionUser?.displayName ?? undefined);
  };

  const handlePlaceUpi = async () => {
    if (isPlacing) return;
    if (!validatePhone()) return;
    setLastPaymentMethod('upi');
    await placeUpiOrder(phone.trim(), sessionUser?.displayName ?? undefined);
  };

  if (orderId) {
    const isOnlinePayment = lastPaymentMethod === 'razorpay' || lastPaymentMethod === 'upi';
    const orderLabel = orderNumber ?? orderId;
    return (
      <CheckoutSuccessView
        title="Order placed"
        subtitle={
          isOnlinePayment
            ? `Your online payment for order #${orderLabel} is confirmed.`
            : `Your COD order #${orderLabel} is confirmed.`
        }
        trackLabel="Track order"
        ordersLabel="View orders"
        browseLabel="Continue browsing"
        onTrack={() => navigate(`/orders/${orderId}/track`)}
        onOrders={() => navigate('/orders')}
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
          title="Set delivery location"
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
        lines: quote.lineItems.map((item) => ({
          label: item.label,
          amountLabel: `₹${item.amount}`,
        })),
        totalLabel: `₹${quote.grandTotal}`,
        deliveryPendingNote: quote.deliveryPending
          ? 'Delivery fee pending address confirmation'
          : undefined,
      }
    : estimatedSubtotal > 0
      ? {
          lines: [{ label: 'Subtotal (estimated)', amountLabel: `₹${estimatedSubtotal}` }],
          totalLabel: `₹${estimatedSubtotal}`,
          deliveryPendingNote: 'Calculating taxes and delivery…',
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
      bill={billView}
      quoteLoading={isBusy && !billView}
      billRefreshing={billRefreshing}
      contact={{
        value: phone,
        error: phoneError ?? undefined,
        hint: 'Required for order updates and delivery coordination',
      }}
      onContactChange={(value) => {
        setPhoneOverride(value);
        if (phoneError) setPhoneError(null);
      }}
      errorMessage={error ?? undefined}
      backLabel="Back to cart"
      onBack={() => navigate('/cart')}
      codLabel="Pay on delivery"
      razorpayLabel={showUpiButton ? 'Pay via UPI' : 'Pay online'}
      codBusy={placingMethod === 'cod'}
      razorpayBusy={placingMethod === 'razorpay' || placingMethod === 'upi'}
      showCod={supportsCod}
      showRazorpay={showRazorpayButton || showUpiButton}
      actionsDisabled={isBusy || !quote}
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
