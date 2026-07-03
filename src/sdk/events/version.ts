/**
 * EventSDK version — frozen at v1.0.0 (M6 PR-14).
 * ADR-024 · Architecture Review Board approved.
 * @see docs/adr/ADR-024-event-platform-v1-freeze.md
 */

export const EVENT_SDK_VERSION = '1.0.0' as const;

/** When true, breaking changes require major version bump + ADR. */
export const EVENT_SDK_FROZEN = true as const;

export { EVENT_SDK_MODULE } from './shared/constants';
