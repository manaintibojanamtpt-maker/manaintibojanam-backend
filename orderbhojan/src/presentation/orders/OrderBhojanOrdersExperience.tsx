import { useNavigate } from 'react-router-dom';
import {
  OrdersListLoadingView,
  OrdersListPageView,
} from '@bhojan/storefront-design-system/orders/OrdersListPageView';
import { useOrdersList } from '@/features/orders/hooks/useOrdersList';
import { mapOrderSummaryToCardView } from './mapOrderSummaryToCardView';

export function OrderBhojanOrdersExperience() {
  const navigate = useNavigate();
  const ordersQuery = useOrdersList();

  if (ordersQuery.isLoading) {
    return <OrdersListLoadingView />;
  }

  const orders = ordersQuery.data?.orders ?? [];

  return (
    <OrdersListPageView
      title="Orders"
      subtitle={
        orders.length > 0
          ? `${orders.length} order${orders.length === 1 ? '' : 's'} · Tap to track live`
          : undefined
      }
      orders={orders.map(mapOrderSummaryToCardView)}
      onSelectOrder={(orderId) => navigate(`/orders/${orderId}/track`)}
      onBrowse={() => navigate('/')}
      onSignIn={() => navigate('/auth')}
      onRetry={() => void ordersQuery.refetch()}
      showRetry={ordersQuery.isError}
    />
  );
}
