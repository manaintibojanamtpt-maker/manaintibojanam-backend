export const GUEST_ORDERS_KEY = 'mib_guest_orders';

export const saveGuestOrder = (orderId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = localStorage.getItem(GUEST_ORDERS_KEY);
    let orders: string[] = [];
    if (existing) {
      orders = JSON.parse(existing);
    }
    if (!orders.includes(orderId)) {
      orders.push(orderId);
      localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
    }
  } catch (e) {
    console.error('Failed to save guest order', e);
  }
};

export const getGuestOrders = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const existing = localStorage.getItem(GUEST_ORDERS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    return [];
  }
};
