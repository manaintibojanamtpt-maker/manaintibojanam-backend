/**
 * M5 PR-8 — Checkout branch session (in-memory, no Firestore).
 */

import type { CheckoutBranchContextSnapshot, CheckoutBranchResolveQuery } from './CheckoutBranchContext';
import { EMPTY_CHECKOUT_BRANCH_CONTEXT } from './CheckoutBranchContext';
import type { CheckoutBranchPresentationError } from './CheckoutBranchErrorMapper';

export type CheckoutBranchSessionStatus =
  | 'idle'
  | 'loading'
  | 'assigned'
  | 'rejected'
  | 'error'
  | 'disabled'
  | 'retry'
  | 'cancelled'
  | 'legacy';

export interface CheckoutBranchSessionSnapshot {
  readonly status: CheckoutBranchSessionStatus;
  readonly context: CheckoutBranchContextSnapshot;
  readonly lastQuery: CheckoutBranchResolveQuery | null;
  readonly lastError: CheckoutBranchPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
  readonly telemetryId: string | null;
}

export const EMPTY_CHECKOUT_BRANCH_SESSION: CheckoutBranchSessionSnapshot = {
  status: 'idle',
  context: EMPTY_CHECKOUT_BRANCH_CONTEXT,
  lastQuery: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
  telemetryId: null,
};

type CheckoutBranchSessionListener = (snapshot: CheckoutBranchSessionSnapshot) => void;

let sessionSnapshot: CheckoutBranchSessionSnapshot = EMPTY_CHECKOUT_BRANCH_SESSION;
const listeners = new Set<CheckoutBranchSessionListener>();

export function getCheckoutBranchSessionSnapshot(): CheckoutBranchSessionSnapshot {
  return sessionSnapshot;
}

export function subscribeCheckoutBranchSession(
  listener: CheckoutBranchSessionListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<CheckoutBranchSessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetCheckoutBranchSession(): void {
  sessionSnapshot = EMPTY_CHECKOUT_BRANCH_SESSION;
  notify();
}

export function markCheckoutBranchLoading(
  query: CheckoutBranchResolveQuery,
  telemetryId: string
): void {
  patchSession({
    status: 'loading',
    lastQuery: query,
    lastError: null,
    lastAttemptAt: Date.now(),
    telemetryId,
  });
}

export function markCheckoutBranchLegacy(context: CheckoutBranchContextSnapshot): void {
  patchSession({
    status: 'legacy',
    context,
    lastError: null,
    retryCount: 0,
  });
}

export function markCheckoutBranchAssigned(context: CheckoutBranchContextSnapshot): void {
  patchSession({
    status: 'assigned',
    context,
    lastError: null,
    retryCount: 0,
  });
}

export function markCheckoutBranchRejected(error: CheckoutBranchPresentationError): void {
  patchSession({
    status: 'rejected',
    lastError: error,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function markCheckoutBranchError(error: CheckoutBranchPresentationError): void {
  patchSession({
    status: 'error',
    lastError: error,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function markCheckoutBranchDisabled(): void {
  patchSession({
    status: 'disabled',
    lastError: null,
  });
}

export function markCheckoutBranchRetry(): void {
  patchSession({
    status: 'retry',
    lastError: null,
  });
}

export function markCheckoutBranchCancelled(): void {
  patchSession({
    status: 'cancelled',
    context: EMPTY_CHECKOUT_BRANCH_CONTEXT,
    lastError: null,
  });
}

export function getLastCheckoutBranchQuery(): CheckoutBranchResolveQuery | null {
  return sessionSnapshot.lastQuery;
}

export function getCheckoutBranchRetryCount(): number {
  return sessionSnapshot.retryCount;
}

export function checkoutBranchSessionIsActive(): boolean {
  const status = sessionSnapshot.status;
  return status === 'loading' || status === 'retry';
}
