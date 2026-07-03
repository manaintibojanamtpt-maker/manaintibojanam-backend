/**
 * PricingSDK version — frozen at v1.0.0 (M8 PR-15).
 * ADR-025 · Architecture Review Board approved.
 */

export const PRICING_SDK_VERSION = '1.0.0' as const;

/** When true, breaking changes require major version bump + ADR. */
export const PRICING_SDK_FROZEN = true as const;

export { PRICING_SDK_MODULE } from './shared/constants';
