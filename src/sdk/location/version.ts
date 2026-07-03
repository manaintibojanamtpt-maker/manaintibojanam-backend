/**
 * LocationSDK version — foundation scaffold (M2 PR-2).
 * Not frozen until ADR + Architecture Board approval.
 * @see docs/m2/LOCATION-SDK-DESIGN.md
 */

export const LOCATION_SDK_VERSION = '1.0.0-browser-location' as const;

/** When true, breaking changes require major version bump + ADR. */
export const LOCATION_SDK_FROZEN = false as const;
