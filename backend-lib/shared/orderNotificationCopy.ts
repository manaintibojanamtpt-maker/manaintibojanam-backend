/**
 * Customer-facing order status copy for email, WhatsApp, and push.
 */

const SELF_PICKUP_KEYWORDS = ['self pickup', 'self-pickup', 'self_pickup', 'customer pickup'];

export function deliveryPartnerLabel(partner: unknown): string {
  if (typeof partner === 'string') return partner.trim();
  if (partner && typeof partner === 'object') {
    const record = partner as { name?: unknown; label?: unknown };
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
  }
  return '';
}

export function isSelfPickupDelivery(partner: unknown): boolean {
  const value = deliveryPartnerLabel(partner).toLowerCase();
  if (!value) return false;
  return SELF_PICKUP_KEYWORDS.some((keyword) => value.includes(keyword));
}

export function isOwnDeliveryPartner(partner: unknown): boolean {
  const value = deliveryPartnerLabel(partner).toLowerCase();
  if (!value) return false;
  return (
    isSelfPickupDelivery(partner) ||
    value.includes('manual') ||
    value.includes('own delivery')
  );
}

export function formatOrderPaymentMethodLabel(paymentMethod: unknown): string {
  const normalized = String(paymentMethod || '').trim().toLowerCase();
  if (normalized === 'cod') return 'Cash on Delivery';
  if (normalized === 'upi') return 'UPI';
  if (normalized === 'razorpay' || normalized === 'online') return 'Online (Razorpay)';
  if (!normalized) return 'Not specified';
  return normalized.toUpperCase();
}

type OrderLike = {
  orderNumber?: unknown;
  deliveryPartner?: unknown;
  fulfillmentType?: unknown;
  deliveryMethod?: unknown;
};

export function buildOrderStatusNotificationMessage(
  order: OrderLike,
  status: string,
): string {
  const orderNumber = order.orderNumber ? `#${order.orderNumber}` : 'your order';
  const statusKey = String(status || '').toUpperCase();
  const selfPickup =
    isSelfPickupDelivery(order.deliveryPartner) ||
    String(order.fulfillmentType || order.deliveryMethod || '')
      .toLowerCase()
      .includes('pickup');

  const messages: Record<string, string> = {
    PENDING: `Your order ${orderNumber} has been placed successfully! We'll start preparing it soon.`,
    PLACED: `Your order ${orderNumber} has been placed successfully! We'll start preparing it soon.`,
    ACCEPTED: `Your order ${orderNumber} has been accepted by the kitchen. Preparation will begin shortly.`,
    PREPARING: `Good news! Our chef is now preparing your order ${orderNumber}. It will be ready shortly.`,
    READY: selfPickup
      ? `Your order ${orderNumber} is ready for pickup! Please collect it from the kitchen when convenient.`
      : `Your order ${orderNumber} is ready and waiting for pickup/delivery!`,
    OUT_FOR_DELIVERY: selfPickup
      ? `Your order ${orderNumber} is ready for self pickup! Please collect it from the kitchen.`
      : isOwnDeliveryPartner(order.deliveryPartner)
        ? `Your order ${orderNumber} is on its way! Our delivery partner will reach you shortly.`
        : `Your order ${orderNumber} is out for delivery! Our rider is on the way to your location.`,
    DELIVERED: selfPickup
      ? `Your order ${orderNumber} has been collected. Enjoy your delicious home-cooked meal!`
      : `Your order ${orderNumber} has been delivered. Enjoy your delicious home-cooked meal!`,
    CANCELLED: `Your order ${orderNumber} has been cancelled. If you paid online, your refund will be processed within 5-7 business days.`,
  };

  return messages[statusKey] || `Order ${orderNumber} status updated to ${statusKey || status}`;
}

export function buildOrderPushNotification(
  order: OrderLike,
  status: string,
): { title: string; body: string } {
  const orderLabel = order.orderNumber
    ? `#${order.orderNumber}`
    : 'your order';
  const statusKey = String(status || '').toUpperCase();
  const selfPickup =
    isSelfPickupDelivery(order.deliveryPartner) ||
    String(order.fulfillmentType || order.deliveryMethod || '')
      .toLowerCase()
      .includes('pickup');

  const messages: Record<string, { title: string; body: string }> = {
    PENDING: {
      title: 'Order placed',
      body: `Your order ${orderLabel} has been placed successfully.`,
    },
    PLACED: {
      title: 'Order placed',
      body: `Your order ${orderLabel} has been placed successfully.`,
    },
    ACCEPTED: {
      title: 'Order accepted',
      body: `Your order ${orderLabel} has been accepted by the kitchen.`,
    },
    PREPARING: {
      title: 'Chef is preparing your order',
      body: `Your order ${orderLabel} is now being prepared.`,
    },
    READY: {
      title: selfPickup ? 'Ready for pickup' : 'Order is ready',
      body: selfPickup
        ? `Your order ${orderLabel} is ready for self pickup.`
        : `Your order ${orderLabel} is ready for pickup or delivery.`,
    },
    OUT_FOR_DELIVERY: {
      title: selfPickup ? 'Ready for pickup' : 'Out for delivery',
      body: selfPickup
        ? `Your order ${orderLabel} is ready for self pickup.`
        : `Your order ${orderLabel} is on the way.`,
    },
    DISPATCHED: {
      title: 'Out for delivery',
      body: `Your order ${orderLabel} has been dispatched.`,
    },
    DELIVERED: {
      title: 'Order delivered',
      body: `Your order ${orderLabel} has been delivered. Enjoy your meal!`,
    },
    CANCELLED: {
      title: 'Order cancelled',
      body: `Your order ${orderLabel} has been cancelled.`,
    },
    PAYMENT_VERIFICATION: {
      title: 'Payment not confirmed',
      body: `Payment for order ${orderLabel} was not confirmed. Please complete checkout or contact support.`,
    },
  };

  return (
    messages[statusKey] || {
      title: 'Order update',
      body: `Your order ${orderLabel} status changed to ${statusKey || 'updated'}.`,
    }
  );
}
