import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  Text,
} from '@bhojan/design-system';

export function OrdersExperiencePage() {
  const navigate = useNavigate();

  return (
    <div className="ob-page-enter ob-empty-orders ob-empty-premium">
      <Text variant="heading" as="h1" style={{ letterSpacing: '-0.03em' }}>Orders</Text>
      <EmptyState
        title="No orders yet"
        description="When you place your first order, it will appear here with live tracking."
        actionLabel="Explore Restaurants"
        onAction={() => navigate('/')}
        icon={
          <div className="ob-empty-orders__icon ob-empty-premium__icon" aria-hidden>
            <Icon size={52} label="No orders">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </Icon>
          </div>
        }
      />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--bds-space-4)' }}>
        <Button variant="ghost" onClick={() => navigate('/auth')}>Sign in to sync orders</Button>
      </div>
    </div>
  );
}
