/** Validates Indian UPI VPA format (user@bank). */
export function isValidUpiId(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  return /^[\w.-]{2,256}@[\w.-]{2,64}$/.test(trimmed);
}

export function normalizeUpiId(value: string): string {
  return value.trim().toLowerCase();
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
  const { upiId, merchantName, amount, orderId, transactionNote } = params;
  const tn = encodeURIComponent(transactionNote?.trim() || `Order ${orderId}`);
  return `upi://pay?pa=${encodeURIComponent(normalizeUpiId(upiId))}&pn=${encodeURIComponent(merchantName)}&am=${formatUpiAmount(amount)}&tr=${encodeURIComponent(orderId)}&tn=${tn}&cu=INR`;
}
