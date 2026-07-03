/**
 * SearchSDK — presentation session DTOs (M4 foundation).
 */

import type { SearchQuery } from './query';
import type { SearchResult } from './results';

export type SearchSessionStatus = 'idle' | 'loading' | 'success' | 'error' | 'disabled';

export interface SearchPresentationError {
  readonly code: string;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export interface SearchSessionSnapshot {
  readonly status: SearchSessionStatus;
  readonly lastQuery: SearchQuery | null;
  readonly lastResult: SearchResult | null;
  readonly lastError: SearchPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
}

export const EMPTY_SEARCH_SESSION: SearchSessionSnapshot = {
  status: 'idle',
  lastQuery: null,
  lastResult: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
};
