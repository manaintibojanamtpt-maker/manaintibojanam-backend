/**
 * M5 PR-5 — Branch session state (loading, retry, last request).
 * In-memory pub/sub — no Firestore, no React.
 */

import type {
  BranchFacadeOperation,
  BranchFacadeRequest,
  BranchPresentationError,
  BranchSessionSnapshot,
  BranchSessionStatus,
} from './types';
import { EMPTY_BRANCH_SESSION } from './types';

type BranchSessionListener = (snapshot: BranchSessionSnapshot) => void;

let sessionSnapshot: BranchSessionSnapshot = EMPTY_BRANCH_SESSION;
const listeners = new Set<BranchSessionListener>();

export function getBranchSessionSnapshot(): BranchSessionSnapshot {
  return sessionSnapshot;
}

export function subscribeBranchSession(listener: BranchSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<BranchSessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetBranchSession(): void {
  sessionSnapshot = EMPTY_BRANCH_SESSION;
  notify();
}

export function markBranchLoading(
  request: BranchFacadeRequest,
  telemetryId: string
): void {
  patchSession({
    status: 'loading',
    lastOperation: request.operation,
    lastRequest: request,
    lastError: null,
    lastAttemptAt: Date.now(),
    telemetryId,
  });
}

export function markBranchRetry(): void {
  patchSession({
    status: 'retry',
    lastError: null,
  });
}

export function markBranchDisabled(): void {
  patchSession({
    status: 'disabled',
    lastError: null,
  });
}

export function markBranchCancelled(): void {
  patchSession({
    status: 'cancelled',
    lastError: null,
  });
}

export function markBranchSuccess(): void {
  patchSession({
    status: 'success',
    lastError: null,
    retryCount: 0,
  });
}

export function markBranchEmpty(): void {
  patchSession({
    status: 'empty',
    lastError: null,
    retryCount: 0,
  });
}

export function markBranchError(error: BranchPresentationError): void {
  patchSession({
    status: 'error',
    lastError: error,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function setBranchSessionStatus(status: BranchSessionStatus): void {
  patchSession({ status });
}

export function getLastBranchRequest(): BranchFacadeRequest | null {
  return sessionSnapshot.lastRequest;
}

export function getBranchRetryCount(): number {
  return sessionSnapshot.retryCount;
}

export function getLastBranchOperation(): BranchFacadeOperation | null {
  return sessionSnapshot.lastOperation;
}

export const sessionIsActive = (): boolean => {
  const status = sessionSnapshot.status;
  return status === 'loading' || status === 'retry';
};
