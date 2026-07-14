const FALLBACK_ORDER_NUMBER_BASE = 100_000;

/** Customer-facing order label — prefer allocated orderNumber over Firestore doc id. */
export function formatCustomerOrderLabel(
  orderNumber: number | string | null | undefined,
  orderId: string,
): string {
  if (typeof orderNumber === 'number' && Number.isFinite(orderNumber) && orderNumber > 0) {
    return String(Math.floor(orderNumber));
  }
  if (typeof orderNumber === 'string' && /^\d+$/.test(orderNumber.trim())) {
    return orderNumber.trim();
  }
  let hash = 0;
  for (let index = 0; index < orderId.length; index += 1) {
    hash = (hash * 31 + orderId.charCodeAt(index)) >>> 0;
  }
  return String(FALLBACK_ORDER_NUMBER_BASE + (hash % 900_000));
}
