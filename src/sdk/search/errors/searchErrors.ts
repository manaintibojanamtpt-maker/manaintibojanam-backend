/**
 * SearchSDK — error codes (M4 foundation).
 */

import type { SdkErrorCode } from '../../core/errors';

export type SearchErrorCode = SdkErrorCode;

export const SEARCH_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'SearchSDK adapter is not configured',
  NO_MATCHES: 'No restaurants matched your search',
  INVALID_QUERY: 'Search query is missing required customer location',
  REPOSITORY_UNAVAILABLE: 'Search repository is unavailable',
  DISCOVERY_UNAVAILABLE: 'DiscoverySDK dependency is unavailable',
} as const;
