/** Validates Indian UPI VPA format (user@bank). */
export function isValidUpiId(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  return /^[\w.-]{2,256}@[\w.-]{2,64}$/.test(trimmed);
}

export function normalizeUpiId(value: string): string {
  return value.trim().toLowerCase();
}

export function buildUpiPayUrl(params: {
  upiId: string;
  merchantName: string;
  amount: number;
  orderId: string;
}): string {
  const { upiId, merchantName, amount, orderId } = params;
  return `upi://pay?pa=${encodeURIComponent(normalizeUpiId(upiId))}&pn=${encodeURIComponent(merchantName)}&am=${amount}&tr=${encodeURIComponent(orderId)}&cu=INR`;
}
