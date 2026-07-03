/** Order event schema constants (M6 PR-5). Pure domain — no SDK imports. */

export const ORDER_EVENT_DOMAIN_VERSION = '0.1.0-order-events' as const;

export const ORDER_AGGREGATE_TYPE = 'Order' as const;

export const ORDER_EVENT_SCHEMA_VERSION = '1.0.0' as const;
export const ORDER_PAYLOAD_VERSION = '1.0.0' as const;

export const ORDER_EVENT_PRODUCER = 'M1-OrderPlatform' as const;

export const ORDER_EVENT_TYPES = {
  CREATED: 'order.created.v1',
  UPDATED: 'order.updated.v1',
  CANCELLED: 'order.cancelled.v1',
} as const;

export type OrderEventTypeName =
  (typeof ORDER_EVENT_TYPES)[keyof typeof ORDER_EVENT_TYPES];
