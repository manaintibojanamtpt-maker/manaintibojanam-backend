import type { CartLine } from '@/features/cart/store/cartStore';
import type { CheckoutPrepareResponse } from '@/types/marketplace';

const STORAGE_KEY = 'ob_checkout_prepare_v1';
const MAX_AGE_MS = 10 * 60_000;

interface CheckoutPrepareSessionEntry {
  readonly signature: string;
  readonly cartSignature: string;
  readonly response: CheckoutPrepareResponse;
  readonly savedAt: number;
}

function readEntries(): CheckoutPrepareSessionEntry[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckoutPrepareSessionEntry[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed.filter((entry) => entry.savedAt >= cutoff);
  } catch {
    return [];
  }
}

function writeEntries(entries: CheckoutPrepareSessionEntry[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 8)));
  } catch {
    // ignore quota / private mode failures
  }
}

export function buildCheckoutCartSignature(input: {
  readonly restaurantId: string;
  readonly contextToken: string;
  readonly lines: readonly CartLine[];
  readonly couponCode?: string | null;
}): string {
  const lineSig = input.lines
    .map((line) => `${line.foodId}:${line.quantity}`)
    .sort()
    .join('|');
  const coupon = input.couponCode?.trim().toUpperCase() || 'none';
  return `${input.restaurantId}:${input.contextToken}:${coupon}:${lineSig}`;
}

export function readCheckoutPrepareSession(
  cartSignature: string,
  prepareSignature?: string | null,
): CheckoutPrepareResponse | null {
  const entries = readEntries();
  const match = entries.find((entry) => {
    if (entry.cartSignature !== cartSignature) return false;
    if (prepareSignature && entry.signature !== prepareSignature) return false;
    return true;
  });
  return match?.response ?? null;
}

export function isCheckoutPrepareSessionCompatible(
  response: CheckoutPrepareResponse,
  couponCode?: string | null,
): boolean {
  const normalized = couponCode?.trim().toUpperCase() || null;
  const discountAmount = Math.max(0, Number(response.quote.discountAmount ?? 0));
  if (normalized) {
    if (discountAmount <= 0) return false;
    return response.quote.lineItems.some(
      (line) =>
        line.amount < 0 &&
        (line.label.startsWith(`Discount (${normalized})`) || line.label.startsWith('Discount')),
    );
  }
  return discountAmount <= 0;
}

export function persistCheckoutPrepareSession(
  signature: string,
  cartSignature: string,
  response: CheckoutPrepareResponse,
): void {
  const entries = readEntries().filter((entry) => entry.signature !== signature);
  entries.unshift({
    signature,
    cartSignature,
    response,
    savedAt: Date.now(),
  });
  writeEntries(entries);
}

export function clearCheckoutPrepareSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearCheckoutPrepareSessionForCart(cartSignature: string): void {
  if (!cartSignature || typeof sessionStorage === 'undefined') return;
  const entries = readEntries().filter((entry) => entry.cartSignature !== cartSignature);
  writeEntries(entries);
}

export function clearCheckoutPrepareSessionsExcept(cartSignature: string): void {
  if (!cartSignature || typeof sessionStorage === 'undefined') return;
  const entries = readEntries().filter((entry) => entry.cartSignature === cartSignature);
  writeEntries(entries);
}


export type CheckoutPrepareQueryData = {
  paymentMethods: string[];
  quote: CheckoutPrepareResponse["quote"];
  scheduling?: CheckoutPrepareResponse["scheduling"];
};

export function cloneCheckoutPrepareForQuery(
  response: CheckoutPrepareResponse,
): CheckoutPrepareQueryData {
  return {
    paymentMethods: [...response.paymentMethods],
    quote: response.quote,
    scheduling: response.scheduling,
  };
}
