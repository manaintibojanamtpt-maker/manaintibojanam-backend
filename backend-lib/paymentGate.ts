/**
 * Phase 1 payment gate — Tenant 0 Razorpay + COD only.
 * Server-side enforcement for fulfillment / dispatch transitions.
 */

const VERIFIED_PAYMENT_STATUSES = new Set(['success', 'verified', 'paid']);

/** Statuses that start kitchen prep or dispatch — require verified payment (except COD). */
export const FULFILLMENT_STATUSES = new Set([
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COURIER_BOOKED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DISPATCHED',
]);

export const normalizePaymentStatus = (value: unknown): string =>
  String(value || 'pending').toLowerCase().trim();

export const isCodOrder = (order: Record<string, unknown>): boolean =>
  order.isCOD === true || String(order.paymentMethod || '').toLowerCase() === 'cod';

export const isPaymentVerified = (order: Record<string, unknown>): boolean => {
  if (isCodOrder(order)) return true;
  return VERIFIED_PAYMENT_STATUSES.has(normalizePaymentStatus(order.paymentStatus));
};

export interface PaymentGateResult {
  allowed: boolean;
  error?: string;
  code?: string;
}

export const assertFulfillmentTransition = (
  order: Record<string, unknown>,
  targetStatus: string
): PaymentGateResult => {
  const target = String(targetStatus || '').toUpperCase();
  if (!FULFILLMENT_STATUSES.has(target)) {
    return { allowed: true };
  }
  if (isPaymentVerified(order)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    code: 'PAYMENT_NOT_VERIFIED',
    error: 'Payment must be verified before this order can move to kitchen or dispatch.',
  };
};
