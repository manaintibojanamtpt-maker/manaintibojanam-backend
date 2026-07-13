import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import {
  CheckoutPageView,
  CheckoutSuccessView,
} from '@bhojan/storefront-design-system/cart/CheckoutPageView';
import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import { phoneNumberSchema } from '@/features/auth/domain/auth.types';
import {
  useActiveLocation,
  useLocationActions,
  useLocationFeatureEnabled,
  useLocationUiState,
} from '@/features/location';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCheckoutFlow } from '@/features/checkout/hooks/useCheckoutFlow';

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
  const { openWizard } = useLocationActions();
  const {
    quote,
    paymentMethods,
    status,
    error,
    orderId,
    itemCount,
    canCheckout,
    prepareCheckout,
    placeCodOrder,
    placeRazorpayOrder,
  } = useCheckoutFlow();

  const sessionPhone = normalizePhoneFromSession(sessionUser?.phoneNumber);
  const [phoneOverride, setPhoneOverride] = useState('');
  const phone = phoneOverride || sessionPhone;
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cod' | 'razorpay' | null>(null);

  const isBusy = status === 'quoting' || status === 'preparing' || status === 'placing';
  const supportsCod = paymentMethods.includes('cod');
  const supportsRazorpay = paymentMethods.includes('razorpay');
  const showBothPaymentOptions = supportsCod && supportsRazorpay;

  const paymentSubtitle = useMemo(() => {
    if (showBothPaymentOptions) return 'Choose how you want to pay';
    if (supportsRazorpay) return 'Pay online securely';
    return 'Cash on delivery';
  }, [showBothPaymentOptions, supportsRazorpay]);

  const paymentHint = useMemo(() => {
    if (supportsCod && !showBothPaymentOptions) {
      return 'Pay with cash when your order arrives.';
    }
    if (supportsRazorpay && showBothPaymentOptions) {
      return 'Pay online with UPI, cards, or net banking. COD remains available if you prefer cash on delivery.';
    }
    return undefined;
  }, [showBothPaymentOptions, supportsCod, supportsRazorpay]);

  useEffect(() => {
    if (!canCheckout) return;
    void prepareCheckout();
  }, [canCheckout, prepareCheckout]);

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
    if (!validatePhone()) return;
    setLastPaymentMethod('cod');
    await placeCodOrder(phone.trim(), sessionUser?.displayName ?? undefined);
  };

  const handlePlaceRazorpay = async () => {
    if (!validatePhone()) return;
    setLastPaymentMethod('razorpay');
    await placeRazorpayOrder(phone.trim(), sessionUser?.displayName ?? undefined);
  };

  if (orderId) {
    const isOnlinePayment = lastPaymentMethod === 'razorpay';
    return (
      <CheckoutSuccessView
        title="Order placed"
        subtitle={
          isOnlinePayment
            ? `Your online payment for order ${orderId} is confirmed.`
            : `Your COD order ${orderId} is confirmed.`
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

  const addressLabel =
    uiStatus === 'loading' ? 'Detecting location…' : activeLocation?.displayLabel ?? DELIVERY_ADDRESS_PLACEHOLDER;

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
      onAddressAction={locationEnabled ? openWizard : undefined}
      bill={
        quote
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
          : undefined
      }
      quoteLoading={isBusy && !quote}
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
      razorpayLabel="Pay online"
      codBusy={status === 'placing' && lastPaymentMethod === 'cod'}
      razorpayBusy={status === 'placing' && lastPaymentMethod === 'razorpay'}
      showCod={supportsCod}
      showRazorpay={supportsRazorpay}
      actionsDisabled={isBusy || !quote}
      hint={paymentHint}
      onPlaceCod={supportsCod ? () => void handlePlaceCod() : undefined}
      onPlaceRazorpay={supportsRazorpay ? () => void handlePlaceRazorpay() : undefined}
    />
  );
}
