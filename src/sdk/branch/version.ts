/**
 * BranchSDK version — M5 v1.0 (ADR-016 accepted 2026-06-26).
 * @see docs/m5/v1.0/BRANCH-PUBLIC-API-v1.md
 */

export const BRANCH_SDK_VERSION = '1.0.0' as const;

/** When true, breaking changes require major version bump + ADR. */
export const BRANCH_SDK_FROZEN = true as const;

export { BRANCH_SDK_MODULE } from './shared/constants';
