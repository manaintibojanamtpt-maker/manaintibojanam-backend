/**
 * GA-2 — Owner dashboard order analytics (legacy Firestore orders).
 */

import type { Order } from '../types';
import { coerceOwnerOrderDate } from './ownerOrderReadModelMapper';

const EXCLUDED_STATUSES = new Set([
  'CANCELLED',
  'EXPIRED',
  'FAILED_DELIVERY',
]);

const PENDING_STATUSES = new Set([
  'CREATED',
  'CONFIRMED',
  'SCHEDULED',
  'PREPARING',
  'READY',
  'DISPATCHED',
]);

export interface TopSellingItem {
  readonly name: string;
  readonly quantity: number;
  readonly revenue: number;
}

export interface OwnerOrderMetrics {
  readonly todayOrderCount: number;
  readonly todayRevenue: number;
  readonly pendingCount: number;
  readonly totalRevenue: number;
  readonly totalOrders: number;
  readonly averageOrderValue: number;
  readonly uniqueCustomers: number;
  readonly topItems: readonly TopSellingItem[];
  readonly recentOrders: readonly Order[];
  readonly peakHourLabel: string | null;
}

function isCountableOrder(order: Order): boolean {
  return !EXCLUDED_STATUSES.has(order.status || '');
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function orderAmount(order: Order): number {
  return order.totalAmount ?? order.total ?? 0;
}

function customerKey(order: Order): string | null {
  return order.userId || order.phone || order.customerPhone || null;
}

export function computeOwnerOrderMetrics(orders: readonly Order[]): OwnerOrderMetrics {
  const now = new Date();
  const countable = orders.filter(isCountableOrder);
  const pending = orders.filter((o) => PENDING_STATUSES.has(o.status || ''));

  let todayOrderCount = 0;
  let todayRevenue = 0;
  let totalRevenue = 0;
  const customers = new Set<string>();
  const itemMap = new Map<string, TopSellingItem>();
  const hourCounts = new Array<number>(24).fill(0);

  for (const order of countable) {
    const amount = orderAmount(order);
    totalRevenue += amount;

    const created = coerceOwnerOrderDate(order.createdAt);
    if (created) {
      hourCounts[created.getHours()] += 1;
      if (isSameCalendarDay(created, now)) {
        todayOrderCount += 1;
        todayRevenue += amount;
      }
    }

    const key = customerKey(order);
    if (key) customers.add(key);

    for (const item of order.items || []) {
      const name = item.name?.trim() || 'Unknown item';
      const qty = item.quantity || 1;
      const revenue = item.lineTotal ?? item.lineSubtotal ?? (item.unitPrice || 0) * qty;
      const existing = itemMap.get(name);
      if (existing) {
        itemMap.set(name, {
          name,
          quantity: existing.quantity + qty,
          revenue: existing.revenue + revenue,
        });
      } else {
        itemMap.set(name, { name, quantity: qty, revenue });
      }
    }
  }

  const topItems = [...itemMap.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const peakHour = hourCounts.reduce(
    (best, count, hour) => (count > best.count ? { hour, count } : best),
    { hour: -1, count: 0 }
  );

  const peakHourLabel =
    peakHour.count > 0
      ? `${peakHour.hour === 0 ? 12 : peakHour.hour > 12 ? peakHour.hour - 12 : peakHour.hour}:00 ${peakHour.hour >= 12 ? 'PM' : 'AM'}`
      : null;

  const recentOrders = [...orders]
    .sort((a, b) => {
      const da = coerceOwnerOrderDate(a.createdAt)?.getTime() ?? 0;
      const db = coerceOwnerOrderDate(b.createdAt)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 5);

  const totalOrders = countable.length;

  return {
    todayOrderCount,
    todayRevenue,
    pendingCount: pending.length,
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    uniqueCustomers: customers.size,
    topItems,
    recentOrders,
    peakHourLabel,
  };
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
