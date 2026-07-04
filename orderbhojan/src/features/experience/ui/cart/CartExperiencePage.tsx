import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  Text,
} from '@bhojan/design-system';
import { useCartPreviewStore } from '../../store/cartPreviewStore';
import { MarketplaceFloatingCart } from '../shared/MarketplaceFloatingCart';

export function CartExperiencePage() {
  const navigate = useNavigate();
  const { itemCount, reset } = useCartPreviewStore();

  if (itemCount > 0) {
    return (
      <div className="ob-page-enter ob-cart-preview">
        <Text variant="heading" as="h1" style={{ letterSpacing: '-0.03em' }}>Cart Preview</Text>
        <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)', marginTop: 'var(--bds-space-2)' }}>
          Mock cart shell only — checkout arrives in a later milestone.
        </Text>
        <Text variant="title" style={{ marginTop: 'var(--bds-space-6)' }}>{itemCount} item{itemCount === 1 ? '' : 's'} added</Text>
        <div style={{ display: 'flex', gap: 'var(--bds-space-3)', marginTop: 'var(--bds-space-6)' }}>
          <Button variant="secondary" onClick={() => navigate('/')}>Continue Browsing</Button>
          <Button variant="ghost" onClick={reset}>Clear mock cart</Button>
        </div>
        <MarketplaceFloatingCart />
      </div>
    );
  }

  return (
    <div className="ob-page-enter ob-empty-cart ob-empty-premium">
      <EmptyState
        title="Your cart is empty"
        description="Add dishes from trending picks on Home. Checkout logic arrives in M7."
        actionLabel="Continue Browsing"
        onAction={() => navigate('/')}
        icon={
          <div className="ob-empty-cart__icon ob-empty-premium__icon" aria-hidden>
            <Icon size={48} label="Empty cart">
              <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
              <path d="M2 2h2l2.5 13h11l2-8H6" />
            </Icon>
          </div>
        }
      />
    </div>
  );
}
