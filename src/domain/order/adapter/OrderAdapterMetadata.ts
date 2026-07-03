/** Order adapter metadata (M6 PR-11). Pure domain — no SDK imports. */

export const ORDER_ADAPTER_MODULE_VERSION = '0.1.0-order-read-adapter' as const;
export const ORDER_ADAPTER_MODULE_NAME = 'order-read-adapter' as const;

export const ORDER_ADAPTER_FALLBACK_REASONS = {
  FLAG_DISABLED: 'FF_ORDER_PROJECTION_ADAPTER_ENABLED is off',
  PARITY_NOT_READY: 'Projection parity not certified READY',
  OPERATIONAL_NOT_GREEN: 'Operational validation not GREEN',
  PROJECTION_UNAVAILABLE: 'Projection repository unavailable',
  PROJECTION_READ_FAILED: 'Projection read failed — fallback to legacy',
} as const;
