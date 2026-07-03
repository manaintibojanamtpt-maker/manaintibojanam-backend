/**
 * M7 PR-5 — Menu session state (in-memory pub/sub).
 */

import type {
  MenuFacadeOperation,
  MenuFacadeRequest,
  MenuPresentationError,
  MenuSessionSnapshot,
  MenuSessionStatus,
} from './MenuContext';
import { EMPTY_MENU_SESSION } from './MenuContext';

type MenuSessionListener = (snapshot: MenuSessionSnapshot) => void;

let sessionSnapshot: MenuSessionSnapshot = EMPTY_MENU_SESSION;
const listeners = new Set<MenuSessionListener>();

export function getMenuSessionSnapshot(): MenuSessionSnapshot {
  return sessionSnapshot;
}

export function subscribeMenuSession(listener: MenuSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<MenuSessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetMenuSession(): void {
  sessionSnapshot = EMPTY_MENU_SESSION;
  notify();
}

export function markMenuLoading(
  operation: MenuFacadeOperation,
  request: MenuFacadeRequest,
  telemetryId: string
): void {
  patchSession({
    status: 'loading',
    lastOperation: operation,
    lastRequest: request,
    lastError: null,
    lastAttemptAt: Date.now(),
    telemetryId,
  });
}

export function markMenuRetry(): void {
  patchSession({
    status: 'retry',
    lastError: null,
  });
}

export function markMenuDisabled(): void {
  patchSession({
    status: 'disabled',
    lastError: null,
  });
}

export function markMenuCancelled(): void {
  patchSession({
    status: 'cancelled',
    lastError: null,
  });
}

export function markMenuSuccess(): void {
  patchSession({
    status: 'success',
    lastError: null,
    retryCount: 0,
  });
}

export function markMenuEmpty(): void {
  patchSession({
    status: 'empty',
    lastError: null,
    retryCount: 0,
  });
}

export function markMenuError(error: MenuPresentationError): void {
  patchSession({
    status: 'error',
    lastError: error,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function getMenuRetryCount(): number {
  return sessionSnapshot.retryCount;
}

export function getLastMenuRequest(): MenuFacadeRequest | null {
  return sessionSnapshot.lastRequest;
}

export function setMenuSessionStatus(status: MenuSessionStatus): void {
  patchSession({ status });
}
