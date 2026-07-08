import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Icon,
  Input,
  MotionPage,
  PremiumEmpty,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { phoneNumberSchema } from '@/features/auth/domain/auth.types';
import {
  useActiveLocation,
  useLocationActions,
  useLocationFeatureEnabled,
  useLocationUiState,
} from '@/features/location';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCheckoutFlow } from '../hooks/useCheckoutFlow';

const DELIVERY_ADDRESS_PLACEHOLDER = 'Set delivery location';

function CheckoutDeliveryAddress() {
  const locationEnabled = useLocationFeatureEnabled();
  const active = useActiveLocation();
  const { uiStatus } = useLocationUiState();
  const { openSelector } = useLocationActions();

  if (!locationEnabled) return null;

  const label =
    uiStatus === 'loading'
      ? 'Detecting location…'
      : active?.displayLabel ?? DELIVERY_ADDRESS_PLACEHOLDER;

  return (
    <section className="ob-checkout-px2__address" aria-label="Delivery address">
      <div className="ob-checkout-px2__address-row">
        <Icon size={20} label="Delivery address" className="ob-checkout-px2__address-icon">
          <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </Icon>
        <div className="ob-checkout-px2__address-detail">
          <Text variant="microLabel" className="ob-checkout-px2__address-label">
            Deliver to
          </Text>
          {uiStatus === 'loading' && !active ? (
            <Skeleton width="70%" height={16} />
          ) : (
            <Text variant="body" className="ob-checkout-px2__address-value">
              {label}
            </Text>
          )}
        </div>
        <Button variant="ghost" size="compact" onClick={openSelector}>
          Change
        </Button>
      </div>
    </section>
  );
}

function BillSummary({
  quote,
}: {
  readonly quote: NonNullable<ReturnType<typeof useCheckoutFlow>['quote']>;
}) {
  return (
    <section className="ob-checkout-px2__bill" aria-label="Bill summary">
      {quote.lineItems.map((item) => (
        <div key={item.label} className="ob-checkout-px2__bill-row">
          <Text variant="body">{item.label}</Text>
          <Text variant="body">₹{item.amount}</Text>
        </div>
      ))}
      <div className="ob-checkout-px2__bill-total">
        <Text variant="subtitle">Total</Text>
        <Text variant="subtitle">₹{quote.grandTotal}</Text>
      </div>
      {quote.deliveryPending ? (
        <Text variant="caption" className="ob-checkout-px2__bill-note">
          Delivery fee pending address confirmation
        </Text>
      ) : null}
    </section>
  );
}

function normalizePhoneFromSession(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { sessionUser } = useAuth();
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
      <MotionPage className="ob-checkout-px2">
        <header className="ob-txn-page__header">
          <Text variant="heading" as="h1" className="ob-txn-page__title">
            Order placed
          </Text>
          <Text variant="body" className="ob-txn-page__subtitle">
            {isOnlinePayment
              ? `Your online payment for order ${orderId} is confirmed.`
              : `Your COD order ${orderId} is confirmed.`}
          </Text>
        </header>
        <div className="ob-checkout-px2__success-actions">
          <Button variant="primary" onClick={() => navigate(`/orders/${orderId}/track`)}>
            Track order
          </Button>
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            View orders
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Continue browsing
          </Button>
        </div>
      </MotionPage>
    );
  }

  if (itemCount === 0) {
    return (
      <MotionPage className="ob-checkout-px2">
        <PremiumEmpty
          title="Nothing to checkout"
          description="Add dishes from a restaurant menu before checking out."
          actionLabel="Browse restaurants"
          onAction={() => navigate('/')}
        />
      </MotionPage>
    );
  }

  if (!canCheckout) {
    return (
      <MotionPage className="ob-checkout-px2">
        <PremiumEmpty
          title="Session expired"
          description="Open the restaurant menu again to refresh checkout context."
          actionLabel="Go to cart"
          onAction={() => navigate('/cart')}
        />
      </MotionPage>
    );
  }

  return (
    <MotionPage className="ob-checkout-px2">
      <header className="ob-txn-page__header">
        <Text variant="heading" as="h1" className="ob-txn-page__title">
          Checkout
        </Text>
        <Text variant="body" className="ob-txn-page__subtitle">
          {itemCount} item{itemCount === 1 ? '' : 's'} · {paymentSubtitle}
        </Text>
      </header>

      <CheckoutDeliveryAddress />

      {isBusy && !quote ? (
        <div className="ob-checkout-px2__quote-loading">
          <Skeleton height="12rem" />
        </div>
      ) : null}

      {quote ? <BillSummary quote={quote} /> : null}

      <div className="ob-checkout-px2__phone">
        <Input
          label="Mobile number"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhoneOverride(event.target.value.replace(/\D/g, '').slice(0, 10));
            if (phoneError) setPhoneError(null);
          }}
          error={phoneError ?? undefined}
          hint="Required for order updates and delivery coordination"
        />
      </div>

      {error ? (
        <Text variant="body" role="alert" className="ob-checkout-px2__error">
          {error}
        </Text>
      ) : null}

      <div className="ob-checkout-px2__actions">
        <Button variant="secondary" onClick={() => navigate('/cart')} disabled={isBusy}>
          Back to cart
        </Button>

        {supportsCod ? (
          <Button
            variant={showBothPaymentOptions ? 'secondary' : 'primary'}
            disabled={isBusy || !quote}
            onClick={() => void handlePlaceCod()}
          >
            {status === 'placing' && lastPaymentMethod === 'cod'
              ? 'Placing order…'
              : 'Pay on delivery'}
          </Button>
        ) : null}

        {supportsRazorpay ? (
          <Button
            variant="primary"
            disabled={isBusy || !quote}
            onClick={() => void handlePlaceRazorpay()}
          >
            {status === 'placing' && lastPaymentMethod === 'razorpay'
              ? 'Opening payment…'
              : 'Pay online'}
          </Button>
        ) : null}
      </div>

      {supportsCod && !showBothPaymentOptions ? (
        <Text variant="caption" className="ob-checkout-px2__hint">
          Pay with cash when your order arrives.
        </Text>
      ) : null}

      {supportsRazorpay && showBothPaymentOptions ? (
        <Text variant="caption" className="ob-checkout-px2__hint">
          Pay online with UPI, cards, or net banking. COD remains available if you prefer cash on delivery.
        </Text>
      ) : null}
    </MotionPage>
  );
}
