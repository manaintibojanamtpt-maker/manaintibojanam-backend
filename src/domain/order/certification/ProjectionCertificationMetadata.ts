/** Projection switch certification metadata (M6 PR-13). Pure domain — no SDK imports. */

export const PROJECTION_CERTIFICATION_MODULE_VERSION = '0.1.0-projection-switch-certification' as const;
export const PROJECTION_CERTIFICATION_MODULE_NAME = 'projection-read-switch-certification' as const;

export const PROJECTION_CERTIFICATION_BLOCK_REASONS = {
  FLAG_DISABLED: 'FF_ORDER_PROJECTION_CERTIFICATION_ENABLED is off',
  PARITY_NOT_CERTIFIED: 'Projection parity not certified',
  OPERATIONAL_NOT_GREEN: 'Operational validation not GREEN',
  SOAK_INCOMPLETE: '72-hour staging soak not complete',
  REPLAY_BELOW_THRESHOLD: 'Replay success below threshold',
  ROLLBACK_RATE_EXCEEDED: 'Rollback rate exceeds threshold',
  LAG_EXCEEDED: 'Projection lag exceeds threshold',
  CRITICAL_DRIFT: 'Unresolved critical drift detected',
  ARB_NOT_APPROVED: 'ARB approval not recorded',
  PRODUCTION_ALREADY_APPROVED: 'Manual production approval already granted — certification only',
  REPOSITORY_UNHEALTHY: 'Projection repository unhealthy',
  PARITY_BELOW_READY: 'Parity below ready threshold',
  OPERATIONAL_AMBER: 'Operational health is AMBER',
} as const;

export const PROJECTION_CERTIFICATION_GO_NO_GO = {
  GO: 'GO — certification READY; await explicit production activation (PR-14)',
  CONDITIONAL_GO: 'CONDITIONAL GO — investigate blockers before activation',
  NO_GO: 'NO GO — certification NOT_READY; legacy remains authoritative',
} as const;
