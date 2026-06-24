import { Order } from '../types';
import { safeParseDate } from '../lib/utils';

export interface MemoryDish {
  name: string;
  count: number;
}

export interface CustomerMemorySummary {
  topDishes: MemoryDish[];
  preferredDeliverySlot: string | null;
  lastPaymentPreference: string | null;
  recentNote: string | null;
  totalOrders: number;
  lifetimeSpend: number;
  latestOrderAt: any;
}

export interface OwnerCustomerMemorySummary extends CustomerMemorySummary {
  id: string;
  name: string;
  phone?: string;
}

const normalizeSlot = (order: Order) => {
  if (order.deliveryTimeSlot && String(order.deliveryTimeSlot).trim().length > 0) {
    return String(order.deliveryTimeSlot).trim();
  }

  if (String(order.deliveryType || '').toLowerCase() === 'asap') {
    return 'ASAP';
  }

  return null;
};

const summarizeOrders = (orders: Order[]): CustomerMemorySummary => {
  const dishCounts = new Map<string, number>();
  const slotCounts = new Map<string, number>();

  const sortedOrders = [...orders].sort(
    (a, b) => safeParseDate(b.createdAt).getTime() - safeParseDate(a.createdAt).getTime()
  );

  sortedOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const name = String(item.name || '').trim();
      if (!name) return;
      dishCounts.set(name, (dishCounts.get(name) || 0) + Math.max(1, Number(item.quantity) || 1));
    });

    const slot = normalizeSlot(order);
    if (slot) {
      slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
    }
  });

  const topDishes = Array.from(dishCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const preferredDeliverySlot =
    Array.from(slotCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;

  const lastPaymentPreference = sortedOrders[0]?.paymentMethod === 'cod'
    ? 'Cash on Delivery'
    : sortedOrders[0]?.paymentMethod === 'razorpay'
      ? 'Online Payment'
      : null;

  const recentNote =
    sortedOrders.find((order) => String(order.specialInstructions || '').trim().length > 0)?.specialInstructions || null;

  const lifetimeSpend = sortedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  return {
    topDishes,
    preferredDeliverySlot,
    lastPaymentPreference,
    recentNote,
    totalOrders: sortedOrders.length,
    lifetimeSpend,
    latestOrderAt: sortedOrders[0]?.createdAt || null
  };
};

export const deriveCustomerMemory = (orders: Order[]): CustomerMemorySummary => {
  return summarizeOrders(orders);
};

export const deriveOwnerCustomerMemories = (orders: Order[]): OwnerCustomerMemorySummary[] => {
  const customerMap = new Map<string, Order[]>();

  orders.forEach((order) => {
    const key = order.userId || order.phone || '';
    if (!key) return;

    const existing = customerMap.get(key) || [];
    existing.push(order);
    customerMap.set(key, existing);
  });

  return Array.from(customerMap.entries())
    .map(([id, customerOrders]) => {
      const latestOrder = [...customerOrders].sort(
        (a, b) => safeParseDate(b.createdAt).getTime() - safeParseDate(a.createdAt).getTime()
      )[0];

      return {
        id,
        name: latestOrder?.customerName || 'Guest Customer',
        phone: latestOrder?.phone,
        ...summarizeOrders(customerOrders)
      };
    })
    .filter((customer) => customer.totalOrders >= 2)
    .sort((a, b) => {
      if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
      return safeParseDate(b.latestOrderAt).getTime() - safeParseDate(a.latestOrderAt).getTime();
    });
};
