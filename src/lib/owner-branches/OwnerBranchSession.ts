/**
 * M5 PR-13 — Owner branch session (in-memory pub/sub).
 */

import type {
  OwnerBranchFacadeOperation,
  OwnerBranchFacadeRequest,
  OwnerBranchPresentationError,
  OwnerBranchSessionSnapshot,
  OwnerBranchSessionStatus,
} from './types';
import { EMPTY_OWNER_BRANCH_SESSION } from './types';

type OwnerBranchSessionListener = (snapshot: OwnerBranchSessionSnapshot) => void;

let sessionSnapshot: OwnerBranchSessionSnapshot = EMPTY_OWNER_BRANCH_SESSION;
const listeners = new Set<OwnerBranchSessionListener>();

export function getOwnerBranchSessionSnapshot(): OwnerBranchSessionSnapshot {
  return sessionSnapshot;
}

export function subscribeOwnerBranchSession(
  listener: OwnerBranchSessionListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<OwnerBranchSessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetOwnerBranchSession(): void {
  sessionSnapshot = EMPTY_OWNER_BRANCH_SESSION;
  notify();
}

export function markOwnerBranchLoading(
  request: OwnerBranchFacadeRequest,
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

export function markOwnerBranchDisabled(): void {
  patchSession({
    status: 'disabled',
    lastError: null,
  });
}

export function markOwnerBranchSuccess(): void {
  patchSession({
    status: 'success',
    lastError: null,
    retryCount: 0,
  });
}

export function markOwnerBranchEmpty(): void {
  patchSession({
    status: 'empty',
    lastError: null,
    retryCount: 0,
  });
}

export function markOwnerBranchError(error: OwnerBranchPresentationError): void {
  patchSession({
    status: 'error',
    lastError: error,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function markOwnerBranchRetry(): void {
  patchSession({
    status: 'retry',
    lastError: null,
  });
}

export function markOwnerBranchCancelled(): void {
  patchSession({
    status: 'cancelled',
    lastError: null,
  });
}

export function getLastOwnerBranchRequest(): OwnerBranchFacadeRequest | null {
  return sessionSnapshot.lastRequest;
}

export function getOwnerBranchRetryCount(): number {
  return sessionSnapshot.retryCount;
}

export function getLastOwnerBranchOperation(): OwnerBranchFacadeOperation | null {
  return sessionSnapshot.lastOperation;
}

export function ownerBranchSessionIsActive(): boolean {
  const status = sessionSnapshot.status;
  return status === 'loading' || status === 'retry';
}
