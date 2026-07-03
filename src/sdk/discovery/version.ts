/**
 * DiscoverySDK version — foundation scaffold (M3 PR-1).
 * Not frozen until ADR + Architecture Board approval.
 * @see docs/m3/DISCOVERY-INTELLIGENCE-PLATFORM.md
 */

export const DISCOVERY_SDK_VERSION = '0.6.0-geoindex' as const;

/** When true, breaking changes require major version bump + ADR. */
export const DISCOVERY_SDK_FROZEN = false as const;

export { DISCOVERY_SDK_MODULE } from './shared/constants';
