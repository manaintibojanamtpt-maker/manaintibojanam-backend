import { useNavigate } from 'react-router-dom';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import { useAuth } from '@/shared/providers/AuthProvider';
import { resolveCheckoutAuthGate } from '@/features/auth/domain/checkoutAuth';

export function CheckoutAuthGateView() {
  const navigate = useNavigate();
  const { status, sessionUser } = useAuth();
  const gate = resolveCheckoutAuthGate({ status, sessionUser });

  if (gate.allowed || status === 'loading') {
    return null;
  }

  const isPhoneGate = gate.reason === 'phone_verification_required';

  return (
    <TransactionalPageShell title="Checkout" subtitle="">
      <MarketplaceUxStateView
        title={isPhoneGate ? 'Verify your mobile number' : 'Sign in to place order'}
        description={gate.message}
        primaryLabel={isPhoneGate ? 'Verify with OTP' : 'Sign in'}
        onPrimary={() =>
          navigate(
            isPhoneGate ? '/auth?tab=phone&returnTo=/checkout' : '/auth?returnTo=/checkout',
            { replace: false },
          )
        }
        secondaryLabel="Back to cart"
        onSecondary={() => navigate('/cart')}
      />
    </TransactionalPageShell>
  );
}
