/** NPCI UPI deep-link builder for direct (non-gateway) payments. */

export function normalizeUpiId(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUpiId(value: string): boolean {
  const trimmed = normalizeUpiId(value);
  if (!trimmed) return false;
  return /^[\w.-]{2,256}@[\w.-]{2,64}$/.test(trimmed);
}

export function formatUpiAmount(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return safe.toFixed(2);
}

export function buildUpiPayUrl(params: {
  upiId: string;
  merchantName: string;
  amount: number;
  orderId: string;
  transactionNote?: string;
}): string {
  const pa = encodeURIComponent(normalizeUpiId(params.upiId));
  const pn = encodeURIComponent(params.merchantName.trim() || 'Merchant');
  const am = formatUpiAmount(params.amount);
  const tr = encodeURIComponent(params.orderId);
  const tn = encodeURIComponent(params.transactionNote?.trim() || `Order ${params.orderId}`);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tr=${tr}&tn=${tn}&cu=INR`;
}

export const UPI_PAYMENT_EXPIRY_MS = 30 * 60 * 1000;

export const VERIFIED_UPI_PAYMENT_STATUSES = new Set(['success', 'verified', 'paid']);

export function isVerifiedUpiPaymentStatus(value: unknown): boolean {
  return VERIFIED_UPI_PAYMENT_STATUSES.has(String(value ?? 'pending').toLowerCase().trim());
}
