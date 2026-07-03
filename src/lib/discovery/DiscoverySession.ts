/**
 * M3 PR-2 — Discovery session state (loading, retry, last result).
 * In-memory pub/sub — no Firestore.
 */

import type { DiscoveryResult } from '../../sdk/discovery/dto';
import type {
  DiscoveryFacadeQuery,
  DiscoveryPresentationError,
  DiscoverySessionSnapshot,
  DiscoverySessionStatus,
} from './types';
import { EMPTY_DISCOVERY_SESSION } from './types';

type DiscoverySessionListener = (snapshot: DiscoverySessionSnapshot) => void;

let sessionSnapshot: DiscoverySessionSnapshot = EMPTY_DISCOVERY_SESSION;
const listeners = new Set<DiscoverySessionListener>();

export function getDiscoverySessionSnapshot(): DiscoverySessionSnapshot {
  return sessionSnapshot;
}

export function subscribeDiscoverySession(listener: DiscoverySessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<DiscoverySessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetDiscoverySession(): void {
  sessionSnapshot = EMPTY_DISCOVERY_SESSION;
  notify();
}

export function markDiscoveryLoading(query: DiscoveryFacadeQuery): void {
  patchSession({
    status: 'loading',
    lastQuery: query,
    lastError: null,
    lastAttemptAt: Date.now(),
  });
}

export function markDiscoveryDisabled(): void {
  patchSession({
    status: 'disabled',
    lastError: null,
    lastResult: null,
  });
}

export function markDiscoverySuccess(result: DiscoveryResult): void {
  patchSession({
    status: 'success',
    lastResult: result,
    lastError: null,
    retryCount: 0,
  });
}

export function markDiscoveryError(error: DiscoveryPresentationError): void {
  patchSession({
    status: 'error',
    lastError: error,
    lastResult: null,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function setDiscoverySessionStatus(status: DiscoverySessionStatus): void {
  patchSession({ status });
}

export function getLastDiscoveryQuery(): DiscoveryFacadeQuery | null {
  return sessionSnapshot.lastQuery;
}

export function getDiscoveryRetryCount(): number {
  return sessionSnapshot.retryCount;
}
