/**
 * M4 PR-4 — Search session state (loading, retry, last result).
 * In-memory pub/sub — no Firestore.
 */

import type { SearchQuery } from '../../sdk/search/dto/query';
import type { SearchResult } from '../../sdk/search/dto/results';
import type {
  SearchFacadeQuery,
  SearchPresentationError,
  SearchSessionSnapshot,
  SearchSessionStatus,
} from './types';
import { EMPTY_SEARCH_SESSION } from './types';

type SearchSessionListener = (snapshot: SearchSessionSnapshot) => void;

let sessionSnapshot: SearchSessionSnapshot = EMPTY_SEARCH_SESSION;
const listeners = new Set<SearchSessionListener>();

export function getSearchSessionSnapshot(): SearchSessionSnapshot {
  return sessionSnapshot;
}

/** Alias for spec naming */
export const snapshot = getSearchSessionSnapshot;

export function subscribeSearchSession(listener: SearchSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Alias for spec naming */
export const subscribe = subscribeSearchSession;

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<SearchSessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetSearchSession(): void {
  sessionSnapshot = EMPTY_SEARCH_SESSION;
  notify();
}

/** Alias for spec naming */
export const reset = resetSearchSession;

export function markSearchLoading(
  facadeQuery: SearchFacadeQuery,
  sdkQuery: SearchQuery,
  telemetryId: string
): void {
  patchSession({
    status: 'loading',
    lastQuery: facadeQuery,
    lastSdkQuery: sdkQuery,
    lastError: null,
    lastAttemptAt: Date.now(),
    telemetryId,
  });
}

export function markSearchRetry(): void {
  patchSession({
    status: 'retry',
    lastError: null,
  });
}

export function markSearchDisabled(): void {
  patchSession({
    status: 'disabled',
    lastError: null,
    lastResult: null,
  });
}

export function markSearchCancelled(): void {
  patchSession({
    status: 'cancelled',
    lastError: null,
  });
}

export function markSearchSuccess(result: SearchResult): void {
  patchSession({
    status: 'success',
    lastResult: result,
    lastError: null,
    retryCount: 0,
  });
}

export function markSearchEmpty(result: SearchResult): void {
  patchSession({
    status: 'empty',
    lastResult: result,
    lastError: null,
    retryCount: 0,
  });
}

export function markSearchError(error: SearchPresentationError): void {
  patchSession({
    status: 'error',
    lastError: error,
    lastResult: null,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function setSearchSessionStatus(status: SearchSessionStatus): void {
  patchSession({ status });
}

export function getLastSearchQuery(): SearchFacadeQuery | null {
  return sessionSnapshot.lastQuery;
}

export function getSearchRetryCount(): number {
  return sessionSnapshot.retryCount;
}
