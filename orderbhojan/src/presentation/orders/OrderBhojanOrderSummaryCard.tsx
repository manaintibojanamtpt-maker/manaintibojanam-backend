import { useNavigate } from 'react-router-dom';
import { OrderSummaryCardView } from '@bhojan/storefront-design-system/orders/OrderSummaryCardView';
import type { OrderSummary } from '@/types/marketplace';
import { mapOrderSummaryToCardView } from './mapOrderSummaryToCardView';

export interface OrderBhojanOrderSummaryCardProps {
  readonly order: OrderSummary;
}

export function OrderBhojanOrderSummaryCard({ order }: OrderBhojanOrderSummaryCardProps) {
  const navigate = useNavigate();

  return (
    <OrderSummaryCardView
      order={mapOrderSummaryToCardView(order)}
      onSelect={() => navigate(`/orders/${order.orderId}/track`)}
    />
  );
}
