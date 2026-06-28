import { Order, OrderStatus } from '../types';

export const TERMINAL_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.EXPIRED,
  OrderStatus.REJECTED,
]);

export function getOrderCreatedTime(order: Order): number {
  const ts = order.createdAt as { toDate?: () => Date; seconds?: number } | string | number | undefined;
  if (!ts) return 0;
  if (typeof ts === 'object' && typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return new Date(ts as string | number).getTime();
}

export function sortOrdersNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => getOrderCreatedTime(b) - getOrderCreatedTime(a));
}

export function isActiveCustomerOrder(order: Order): boolean {
  if (TERMINAL_ORDER_STATUSES.has(order.status as OrderStatus)) return false;

  const isInvalidPayment =
    (order.paymentStatus === 'failed' || order.paymentStatus === 'expired') &&
    order.paymentMethod !== 'cod' &&
    !order.isCOD;

  return !isInvalidPayment;
}

export function findActiveOrder(orders: Order[]): Order | null {
  return sortOrdersNewestFirst(orders).find(isActiveCustomerOrder) ?? null;
}
