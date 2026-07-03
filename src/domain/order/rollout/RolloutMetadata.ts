/** Rollout metadata (M6 PR-12). Pure domain — no SDK imports. */

export const ROLLOUT_MODULE_VERSION = '0.1.0-projection-rollout' as const;
export const ROLLOUT_MODULE_NAME = 'projection-read-rollout' as const;

export const ROLLOUT_BLOCK_REASONS = {
  FLAG_DISABLED: 'FF_ORDER_PROJECTION_ROLLOUT_ENABLED is off',
  STAGE_ZERO: 'Rollout stage 0 — legacy only',
  MANUAL_APPROVAL_REQUIRED: 'Manual approval required for stage promotion',
  PARITY_NOT_READY: 'Projection parity not READY',
  OPERATIONAL_NOT_GREEN: 'Operational validation not GREEN',
  REPOSITORY_UNHEALTHY: 'Projection repository unhealthy',
  FALLBACK_SPIKE: 'Fallback rate exceeds threshold',
  TELEMETRY_UNHEALTHY: 'Rollout telemetry unhealthy',
  AUTOMATIC_ROLLBACK: 'Automatic rollback triggered',
} as const;

export const ROLLOUT_ROLLBACK_REASONS = {
  PROJECTION_UNAVAILABLE: 'Projection repository unavailable',
  PARITY_BELOW_THRESHOLD: 'Parity below rollout threshold',
  OPERATIONAL_RED: 'Operational health is RED',
  FALLBACK_RATE_EXCEEDED: 'Fallback rate exceeded threshold',
  LATENCY_EXCEEDED: 'Projection latency exceeded threshold',
} as const;
