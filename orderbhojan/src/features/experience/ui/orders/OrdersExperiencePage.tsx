import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  MotionPage,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { useOrdersList } from '@/features/orders/hooks/useOrdersList';
import { OrderSummaryCard } from '@/features/orders/ui/OrderSummaryCard';

export function OrdersExperiencePage() {
  const navigate = useNavigate();
  const ordersQuery = useOrdersList();

  if (ordersQuery.isLoading) {
    return (
      <MotionPage className="ob-orders-px2">
        <Skeleton height="2rem" />
        <Skeleton height="5rem" />
      </MotionPage>
    );
  }

  const orders = ordersQuery.data?.orders ?? [];

  return (
    <MotionPage className="ob-orders-px2">
      <header className="ob-txn-page__header">
        <Text variant="heading" as="h1" className="ob-txn-page__title">
          Orders
        </Text>
        {orders.length > 0 ? (
          <Text variant="body" className="ob-txn-page__subtitle">
            {orders.length} order{orders.length === 1 ? '' : 's'} · Tap to track live
          </Text>
        ) : null}
      </header>

      {orders.length === 0 ? (
        <div className="ob-empty-orders ob-empty-premium">
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
          <div className="ob-orders-px2__sign-in">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign in to sync orders
            </Button>
          </div>
        </div>
      ) : (
        <ul className="ob-orders-px2__list">
          {orders.map((order) => (
            <li key={order.orderId}>
              <OrderSummaryCard order={order} />
            </li>
          ))}
        </ul>
      )}

      {ordersQuery.isError ? (
        <Button
          variant="ghost"
          className="ob-orders-px2__retry"
          onClick={() => ordersQuery.refetch()}
        >
          Retry loading orders
        </Button>
      ) : null}
    </MotionPage>
  );
}
