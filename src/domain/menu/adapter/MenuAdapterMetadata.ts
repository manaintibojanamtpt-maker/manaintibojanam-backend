/** Menu adapter metadata (M7 PR-11). Pure domain — no SDK imports. */

export const MENU_ADAPTER_MODULE_VERSION = '0.1.0-menu-read-adapter' as const;
export const MENU_ADAPTER_MODULE_NAME = 'menu-read-adapter' as const;

export const MENU_ADAPTER_FALLBACK_REASONS = {
  FLAG_DISABLED: 'FF_MENU_PROJECTION_ADAPTER_ENABLED is off',
  PROJECTION_NOT_READY: 'Projection soak certification not READY',
  OPERATIONAL_NOT_GREEN: 'Operational validation not GREEN',
  PROJECTION_UNHEALTHY: 'Projection repository unhealthy',
  PROJECTION_READ_FAILED: 'Projection read failed — fallback to legacy',
  PROJECTION_NOT_FOUND: 'Projection catalog not found — fallback to legacy',
  PROJECTION_VALIDATION_FAILED: 'Projection validation failed — fallback to legacy',
  PROJECTION_MAPPER_FAILED: 'Projection mapper failed — fallback to legacy',
  PROJECTION_TIMEOUT: 'Projection read timed out — fallback to legacy',
} as const;
