import type { OrderSummary } from '@/types/marketplace';
import type { OrderSummaryCardViewModel } from '@bhojan/storefront-design-system/orders/types';

function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function resolveStatusTone(status: string): OrderSummaryCardViewModel['statusTone'] {
  const normalized = status.toUpperCase();
  if (normalized.includes('DELIVER') || normalized.includes('COMPLETE')) return 'complete';
  if (normalized.includes('CANCEL')) return 'cancelled';
  return 'active';
}

export function mapOrderSummaryToCardView(order: OrderSummary): OrderSummaryCardViewModel {
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    displayName: order.displayName,
    statusLabel: order.status,
    statusTone: resolveStatusTone(order.status),
    totalLabel: `₹${order.grandTotal}`,
    dateLabel: formatOrderDate(order.createdAt),
    trackLabel: 'Track',
    ariaLabel: `Order #${order.orderNumber} from ${order.displayName}`,
  };
}
