import type { MenuItem } from '../types';
import type { OwnerOrder } from '../lib/ownerOrdersReads';

export const DASHBOARD_REALTIME_POLL_MS = 15_000;
export const DASHBOARD_REALTIME_POLL_BACKOFF_MS = 60_000;
export const DASHBOARD_ORDERS_LIMIT = 200;

export const NEW_ORDER_STATUSES = new Set([
  'PENDING',
  'CREATED',
  'PLACED',
  'PENDING_PAYMENT',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFICATION',
]);

export const ACTIVE_ORDER_EXCLUDE_STATUSES = new Set([
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
  'FAILED_DELIVERY',
]);

export interface LowStockAlert {
  name: string;
  stock: number;
  isCritical: boolean;
}

export function computePendingOrders(orders: OwnerOrder[]): OwnerOrder[] {
  return orders.filter((order) =>
    NEW_ORDER_STATUSES.has(String(order.status || '').toUpperCase()),
  );
}

export function computePendingOrderCount(orders: OwnerOrder[]): number {
  return computePendingOrders(orders).length;
}

export function filterActiveOrders(orders: OwnerOrder[]): OwnerOrder[] {
  return orders.filter(
    (order) => !ACTIVE_ORDER_EXCLUDE_STATUSES.has(String(order.status || '').toUpperCase()),
  );
}

export function computeLowStockAlerts(items: MenuItem[]): LowStockAlert[] {
  return (items ?? [])
    .filter(
      (item) =>
        item.stockCount !== undefined &&
        item.lowStockThreshold !== undefined &&
        item.stockCount <= item.lowStockThreshold,
    )
    .map((item) => ({
      name: item.name,
      stock: item.stockCount ?? 0,
      isCritical: (item.stockCount ?? 0) <= 0,
    }));
}

export function detectNewOrderIds(
  previousIds: Set<string> | null,
  pendingOrders: OwnerOrder[],
): { nextKnownIds: Set<string>; newOrderCount: number } {
  const currentIds = new Set(pendingOrders.map((order) => order.id).filter(Boolean));

  if (previousIds === null) {
    return { nextKnownIds: currentIds, newOrderCount: 0 };
  }

  let newOrderCount = 0;
  currentIds.forEach((id) => {
    if (!previousIds.has(id)) newOrderCount += 1;
  });

  return { nextKnownIds: currentIds, newOrderCount };
}
