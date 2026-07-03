/**
 * M3 PR-2 — Discovery presentation types.
 */

import type { DiscoveryResult } from '../../sdk/discovery/dto';

export type DiscoverySessionStatus = 'idle' | 'loading' | 'success' | 'error' | 'disabled';

/** Presentation-layer discovery request (UI → facade). */
export interface DiscoveryFacadeQuery {
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly searchText?: string;
  readonly cuisineTags?: readonly string[];
  readonly areaCode?: string;
  readonly tenantId?: string;
  readonly includeClosed?: boolean;
  /** Optional override; default reads CustomerCanonicalLocation session. */
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly customerGeohash?: string;
}

export interface DiscoveryPresentationError {
  readonly code: string;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export interface DiscoveryFacadeSuccess {
  readonly ok: true;
  readonly result: DiscoveryResult;
}

export interface DiscoveryFacadeFailure {
  readonly ok: false;
  readonly error: DiscoveryPresentationError;
}

export type DiscoveryFacadeOutcome = DiscoveryFacadeSuccess | DiscoveryFacadeFailure;

export interface DiscoverySessionSnapshot {
  readonly status: DiscoverySessionStatus;
  readonly lastQuery: DiscoveryFacadeQuery | null;
  readonly lastResult: DiscoveryResult | null;
  readonly lastError: DiscoveryPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
}

export const EMPTY_DISCOVERY_SESSION: DiscoverySessionSnapshot = {
  status: 'idle',
  lastQuery: null,
  lastResult: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
};
