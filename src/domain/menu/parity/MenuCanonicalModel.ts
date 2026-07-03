/**
 * Menu canonical parity model (M7 PR-8).
 * Pure domain — no infrastructure imports.
 */

export const MENU_CANONICAL_VERSION = '1.0.0' as const;

export type LegacyMenuTimestamp =
  | string
  | number
  | { readonly toDate?: () => Date; readonly _seconds?: number; readonly seconds?: number };

/**
 * Legacy menu repository document shape (validation-only; not wired to Firestore).
 */
export interface LegacyMenuCatalogDocument {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly branchId?: string;
  readonly catalogVersion: string;
  readonly status: string;
  readonly categoryCount: number;
  readonly itemCount: number;
  readonly modifierGroupCount: number;
  readonly comboCount: number;
  readonly updatedAt: LegacyMenuTimestamp;
  readonly projectionVersion?: string;
  readonly snapshotId?: string;
  readonly checkpoint?: string;
}

export interface MenuCanonicalModel {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly branchId?: string;
  readonly catalogVersion: string;
  readonly status: string;
  readonly categoryCount: number;
  readonly itemCount: number;
  readonly modifierGroupCount: number;
  readonly comboCount: number;
  readonly updatedAt: string;
}

export function resolveMenuParityTimestamp(
  value: LegacyMenuTimestamp | undefined,
  fallback: string
): string {
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

export function normalizeMenuParityStatus(status: string | undefined | null): string {
  if (!status) return 'UNKNOWN';
  return String(status).trim().toUpperCase().replace(/\s+/g, '_');
}
