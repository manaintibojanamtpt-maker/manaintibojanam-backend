/** Order read projection metadata (M6 PR-7). Pure domain — no SDK imports. */

export const ORDER_PROJECTION_DOMAIN_VERSION = '0.1.0-order-projection' as const;

export const ORDER_READ_PROJECTION_NAME = 'order-read-shadow' as const;
export const ORDER_READ_PROJECTION_VERSION = '1.0.0' as const;
export const ORDER_READ_PROJECTION_CONSUMER_GROUP = 'order-read-shadow' as const;
export const ORDER_READ_PROJECTION_OWNER = 'M1-OrderPlatform' as const;

export const DEFAULT_ORDER_CURRENCY = 'INR' as const;

export const SUPPORTED_ORDER_PROJECTION_EVENTS = [
  'order.created.v1',
  'order.updated.v1',
  'order.cancelled.v1',
] as const;

export type SupportedOrderProjectionEvent =
  (typeof SUPPORTED_ORDER_PROJECTION_EVENTS)[number];

export function isSupportedOrderProjectionEvent(
  eventType: string
): eventType is SupportedOrderProjectionEvent {
  return (SUPPORTED_ORDER_PROJECTION_EVENTS as readonly string[]).includes(eventType);
}
