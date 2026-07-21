declare global {
  interface Window {
    __OB_DEBUG__?: boolean;
  }
}

export const OB_DEBUG_STORAGE_KEY = 'ob_debug';
export const OB_DEBUG_QUERY_PARAM = 'debug';

export type ObTrustDebugSnapshot = {
  readonly locationMode?: 'current' | 'selected' | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly isConfirmed?: boolean | null;
  readonly shownKitchens?: number | null;
  readonly excludedKitchens?: number | null;
  readonly checkoutGrandTotal?: number | null;
  readonly razorpayAmountPaise?: number | null;
  readonly authReturnTo?: string | null;
};

const trustSnapshot: ObTrustDebugSnapshot = {};

function readQueryDebugFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get(OB_DEBUG_QUERY_PARAM) === '1';
  } catch {
    return false;
  }
}

function readStorageDebugFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OB_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function hasExplicitDebugFlag(): boolean {
  return readQueryDebugFlag() || readStorageDebugFlag();
}

/** True only with an explicit opt-in flag — never enabled in production by default. */
export function isObDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__OB_DEBUG__ === true) return true;
  if (!hasExplicitDebugFlag()) return false;
  return true;
}

/** Persist `?debug=1` into localStorage for subsequent navigations (phone testing). */
export function bootstrapObDebugFromUrl(): void {
  if (typeof window === 'undefined' || !readQueryDebugFlag()) return;
  try {
    window.localStorage.setItem(OB_DEBUG_STORAGE_KEY, '1');
    window.__OB_DEBUG__ = true;
  } catch {
    // ignore quota / private mode
  }
}

export function patchObTrustDebugSnapshot(patch: Partial<ObTrustDebugSnapshot>): void {
  Object.assign(trustSnapshot, patch);
  if (typeof window !== 'undefined') {
    (window as Window & { __OB_TRUST_DEBUG__?: ObTrustDebugSnapshot }).__OB_TRUST_DEBUG__ = {
      ...trustSnapshot,
    };
  }
}

export function readObTrustDebugSnapshot(): Readonly<ObTrustDebugSnapshot> {
  return { ...trustSnapshot };
}

export function obDebugLog(scope: string, message: string, detail?: unknown): void {
  if (!isObDebugEnabled()) return;
  if (detail === undefined) {
    console.debug(`[OB debug:${scope}] ${message}`);
    return;
  }
  console.debug(`[OB debug:${scope}] ${message}`, detail);
}

export function obDebugGroup(scope: string, message: string, detail?: unknown): void {
  if (!isObDebugEnabled()) return;
  console.groupCollapsed(`[OB debug:${scope}] ${message}`);
  if (detail !== undefined) {
    console.debug(detail);
  }
}

export function obDebugGroupEnd(): void {
  if (!isObDebugEnabled()) return;
  console.groupEnd();
}

export function obDebugTrustEvent(
  scope: string,
  message: string,
  detail: Record<string, unknown>,
  snapshotPatch?: Partial<ObTrustDebugSnapshot>,
): void {
  if (!isObDebugEnabled()) return;
  if (snapshotPatch) {
    patchObTrustDebugSnapshot(snapshotPatch);
  }
  obDebugGroup(scope, message, detail);
  obDebugGroupEnd();
}
