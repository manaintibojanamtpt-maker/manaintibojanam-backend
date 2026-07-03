/**
 * SearchSDK version — foundation scaffold (M4 PR-1).
 * Not frozen until ADR + Architecture Board approval.
 * @see docs/m4/SEARCH-INTELLIGENCE-PLATFORM.md
 */

export const SEARCH_SDK_VERSION = '0.1.0-foundation' as const;

/** When true, breaking changes require major version bump + ADR. */
export const SEARCH_SDK_FROZEN = false as const;

export { SEARCH_SDK_MODULE } from './shared/constants';
