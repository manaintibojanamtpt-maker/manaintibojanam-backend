/**
 * MenuSDK version — frozen at v1.0.0 (M7 PR-15).
 * ADR-023 · Architecture Review Board approved.
 */

export const MENU_SDK_VERSION = '1.0.0' as const;

/** When true, breaking changes require major version bump + ADR. */
export const MENU_SDK_FROZEN = true as const;

export { MENU_SDK_MODULE } from './shared/constants';
