/**
 * OrderSDK Read API version — frozen at v1.0.0 (ADR-013).
 * @see docs/adr/ADR-013-order-sdk-read-v1-freeze.md
 */

export const ORDER_SDK_READ_API_VERSION = '1.0.0' as const;

/** When true, breaking changes to read API require major version bump + ADR. */
export const ORDER_SDK_READ_API_FROZEN = true as const;
