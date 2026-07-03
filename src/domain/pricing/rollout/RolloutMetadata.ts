/** Pricing rollout metadata (M8 PR-12). Pure domain — no SDK imports. */

export const ROLLOUT_MODULE_VERSION = '0.1.0-pricing-projection-rollout' as const;
export const ROLLOUT_MODULE_NAME = 'pricing-projection-rollout' as const;

export const ROLLOUT_BLOCK_REASONS = {
  FLAG_DISABLED: 'FF_PRICING_PROJECTION_ROLLOUT_ENABLED is off',
  STAGE_ZERO: 'Rollout stage 0 — legacy only',
  MANUAL_APPROVAL_REQUIRED: 'Manual approval required for stage promotion',
  PROJECTION_NOT_READY: 'Projection soak certification not READY',
  OPERATIONAL_NOT_GREEN: 'Operational validation not GREEN',
  REPOSITORY_UNHEALTHY: 'Projection repository unhealthy',
  FALLBACK_SPIKE: 'Fallback rate exceeds threshold',
  TELEMETRY_UNHEALTHY: 'Rollout telemetry unhealthy',
  AUTOMATIC_ROLLBACK: 'Automatic rollback triggered',
} as const;

export const ROLLOUT_ROLLBACK_REASONS = {
  PROJECTION_UNAVAILABLE: 'Projection repository unavailable',
  PARITY_BELOW_THRESHOLD: 'Projection parity below rollout threshold',
  OPERATIONAL_RED: 'Operational validation RED',
  FALLBACK_RATE_EXCEEDED: 'Fallback rate exceeded threshold',
  LATENCY_EXCEEDED: 'P95 latency exceeded threshold',
} as const;
