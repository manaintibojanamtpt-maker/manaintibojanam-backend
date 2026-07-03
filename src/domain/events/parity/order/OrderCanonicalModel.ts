/** Order canonical parity model (M6 PR-8). Pure domain — no SDK imports. */

export const ORDER_CANONICAL_VERSION = '1.0.0' as const;
export const DEFAULT_PARITY_CURRENCY = 'INR' as const;

export interface OrderCanonicalLineItem {
  readonly menuItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly lineTotal: number;
}

export interface OrderCanonicalModel {
  readonly orderId: string;
  readonly tenantId: string;
  readonly status: string;
  readonly branchId?: string;
  readonly customerId?: string;
  readonly currency: string;
  readonly totalAmount?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: string;
  readonly lineItems: readonly OrderCanonicalLineItem[];
}

export type LegacyTimestamp =
  | string
  | number
  | { readonly toDate?: () => Date; readonly _seconds?: number; readonly seconds?: number };

export function resolveParityTimestamp(value: LegacyTimestamp | undefined, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    const seconds = value._seconds ?? value.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return fallback;
}

export function normalizeParityStatus(status: string | undefined | null): string {
  if (!status) return 'UNKNOWN';
  const normalized = String(status).trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'PLACED') return 'PENDING';
  return normalized;
}

export function normalizeParityLineItem(item: {
  menuItemId?: string;
  name?: string;
  quantity?: number;
  lineTotal?: number;
}): OrderCanonicalLineItem {
  return {
    menuItemId: item.menuItemId ?? '',
    name: item.name ?? '',
    quantity: item.quantity ?? 0,
    lineTotal: item.lineTotal ?? 0,
  };
}
