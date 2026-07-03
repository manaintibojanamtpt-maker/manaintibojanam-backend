/**
 * ReferenceSDK version — foundation scaffold (M2 PR-3).
 * Not frozen until ADR + Architecture Board approval.
 * @see docs/m2/PR-3-REFERENCE-DATA-PLATFORM-REPORT.md
 */

export const REFERENCE_SDK_VERSION = '1.0.0-foundation' as const;

/** When true, breaking changes require major version bump + ADR. */
export const REFERENCE_SDK_FROZEN = false as const;
