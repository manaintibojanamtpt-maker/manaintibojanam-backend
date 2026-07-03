/**
 * DiscoverySDK — error codes (M3 foundation).
 */

import type { SdkErrorCode } from '../../core/errors';

export type DiscoveryErrorCode = SdkErrorCode;

export const DISCOVERY_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'DiscoverySDK adapter is not configured',
  NO_CANDIDATES: 'No discovery candidates found for this location',
  INVALID_QUERY: 'Discovery query is missing required customer point',
  REPOSITORY_UNAVAILABLE: 'Discovery repository is unavailable',
} as const;
