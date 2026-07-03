/**
 * M8 PR-5 — Pricing session state (in-memory pub/sub).
 */

import type {
  PricingFacadeRequest,
  PricingPresentationError,
  PricingSessionSnapshot,
  PricingSessionStatus,
} from './PricingContext';
import { EMPTY_PRICING_SESSION } from './PricingContext';

type PricingSessionListener = (snapshot: PricingSessionSnapshot) => void;

let sessionSnapshot: PricingSessionSnapshot = EMPTY_PRICING_SESSION;
const listeners = new Set<PricingSessionListener>();

export function getPricingSessionSnapshot(): PricingSessionSnapshot {
  return sessionSnapshot;
}

export function subscribePricingSession(listener: PricingSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = (): void => {
  listeners.forEach((listener) => listener(sessionSnapshot));
};

const patchSession = (patch: Partial<PricingSessionSnapshot>): void => {
  sessionSnapshot = { ...sessionSnapshot, ...patch };
  notify();
};

export function resetPricingSession(): void {
  sessionSnapshot = EMPTY_PRICING_SESSION;
  notify();
}

export function markPricingLoading(
  request: PricingFacadeRequest,
  telemetryId: string
): void {
  patchSession({
    status: 'loading',
    currentRequest: request,
    lastRequest: request,
    lastError: null,
    lastAttemptAt: Date.now(),
    telemetryId,
  });
}

export function markPricingRetry(): void {
  patchSession({
    status: 'retry',
    lastError: null,
  });
}

export function markPricingDisabled(): void {
  patchSession({
    status: 'disabled',
    currentRequest: null,
    lastError: null,
  });
}

export function markPricingCancelled(): void {
  patchSession({
    status: 'cancelled',
    currentRequest: null,
    lastError: null,
  });
}

export function markPricingSuccess(result: unknown): void {
  patchSession({
    status: 'success',
    currentRequest: null,
    lastResult: result,
    lastError: null,
    retryCount: 0,
    lastSuccessAt: Date.now(),
  });
}

export function markPricingEmpty(result: unknown = null): void {
  patchSession({
    status: 'empty',
    currentRequest: null,
    lastResult: result,
    lastError: null,
    retryCount: 0,
    lastSuccessAt: Date.now(),
  });
}

export function markPricingError(error: PricingPresentationError): void {
  patchSession({
    status: 'error',
    currentRequest: null,
    lastError: error,
    retryCount: error.retryable ? sessionSnapshot.retryCount + 1 : sessionSnapshot.retryCount,
  });
}

export function getPricingRetryCount(): number {
  return sessionSnapshot.retryCount;
}

export function getLastPricingRequest(): PricingFacadeRequest | null {
  return sessionSnapshot.lastRequest;
}

export function setPricingSessionStatus(status: PricingSessionStatus): void {
  patchSession({ status });
}
