/**
 * M4 PR-4 — Search presentation types.
 */

import type { SearchQuery } from '../../sdk/search/dto/query';
import type { SearchResult } from '../../sdk/search/dto/results';

export type SearchSessionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'retry'
  | 'cancelled'
  | 'disabled';

/** Presentation-layer search request (UI → facade). */
export interface SearchFacadeQuery {
  readonly text?: string;
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly cuisineTags?: readonly string[];
  readonly areaCode?: string;
  readonly localityName?: string;
  readonly cityName?: string;
  readonly pincode?: string;
  readonly districtName?: string;
  readonly tags?: readonly string[];
  readonly openNow?: boolean;
  readonly vegOnly?: boolean;
  readonly minRating?: number;
  readonly maxDeliveryMins?: number;
  readonly maxDistanceKm?: number;
  /** Optional override; default reads CustomerCanonicalLocation session. */
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly customerGeohash?: string;
}

export interface SearchPresentationError {
  readonly code: string;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export interface SearchFacadeSuccess {
  readonly ok: true;
  readonly result: SearchResult;
}

export interface SearchFacadeFailure {
  readonly ok: false;
  readonly error: SearchPresentationError;
}

export type SearchFacadeOutcome = SearchFacadeSuccess | SearchFacadeFailure;

export interface SearchSessionSnapshot {
  readonly status: SearchSessionStatus;
  readonly lastQuery: SearchFacadeQuery | null;
  readonly lastSdkQuery: SearchQuery | null;
  readonly lastResult: SearchResult | null;
  readonly lastError: SearchPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
  readonly telemetryId: string | null;
}

export const EMPTY_SEARCH_SESSION: SearchSessionSnapshot = {
  status: 'idle',
  lastQuery: null,
  lastSdkQuery: null,
  lastResult: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
  telemetryId: null,
};

export interface SearchTelemetrySnapshot {
  readonly attemptId: string;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly status: SearchSessionStatus;
  readonly contextMs: number | null;
  readonly sdkMs: number | null;
  readonly totalMs: number | null;
}

export const EMPTY_SEARCH_TELEMETRY: SearchTelemetrySnapshot = {
  attemptId: '',
  startedAt: 0,
  completedAt: null,
  status: 'idle',
  contextMs: null,
  sdkMs: null,
  totalMs: null,
};
