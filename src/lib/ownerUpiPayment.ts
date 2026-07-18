const AWAITING_PAYMENT_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFICATION',
  'PLACED',
  'PENDING',
  'CREATED',
]);

const PENDING_PAYMENT_VALUES = new Set(['pending', 'pending_verification']);

export function isAwaitingOwnerUpiVerification(order: {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isCOD?: boolean;
}): boolean {
  const method = String(order.paymentMethod || '').toLowerCase();
  if (method !== 'upi' || order.isCOD === true) return false;

  const paymentStatus = String(order.paymentStatus || 'pending').toLowerCase();
  if (!PENDING_PAYMENT_VALUES.has(paymentStatus)) return false;

  const status = String(order.status || '').toUpperCase();
  return AWAITING_PAYMENT_STATUSES.has(status);
}

export function isOwnerActionablePlacedOrder(status: string): boolean {
  const normalized = String(status || '').toUpperCase();
  return ['PENDING', 'CREATED', 'PLACED', 'PENDING_PAYMENT', 'PAYMENT_PENDING'].includes(normalized);
}
