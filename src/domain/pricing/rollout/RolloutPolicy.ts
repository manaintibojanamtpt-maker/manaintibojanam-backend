/** Pricing rollout policy rules (M8 PR-12). Pure domain — no SDK imports. */

import { ROLLOUT_BLOCK_REASONS, ROLLOUT_ROLLBACK_REASONS } from './RolloutMetadata';
import type { RolloutHealthSnapshot } from './RolloutHealth';
import type {
  RolloutPromotionDecision,
  RolloutRollbackDecision,
  RolloutRoutingDecision,
} from './RolloutDecision';
import {
  getNextRolloutStage,
  getRolloutStageDefinition,
  type RolloutStageId,
} from './RolloutStage';
import type { RolloutThresholds } from './RolloutThresholds';
import { DEFAULT_ROLLOUT_THRESHOLDS } from './RolloutThresholds';

export interface RolloutPolicyContext {
  readonly rolloutFlagEnabled: boolean;
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly health: RolloutHealthSnapshot;
  readonly thresholds?: RolloutThresholds;
}

export interface RolloutRoutingContext extends RolloutPolicyContext {
  readonly routingKey: string;
}

function stableBucket(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export function evaluateRolloutRollback(
  health: RolloutHealthSnapshot,
  thresholds: RolloutThresholds = DEFAULT_ROLLOUT_THRESHOLDS
): RolloutRollbackDecision {
  if (!health.projectionRepositoryHealthy) {
    return {
      required: true,
      reason: ROLLOUT_ROLLBACK_REASONS.PROJECTION_UNAVAILABLE,
      triggeredBy: 'projection_repository',
    };
  }
  if (health.parityPercent < thresholds.minParityPercent) {
    return {
      required: true,
      reason: ROLLOUT_ROLLBACK_REASONS.PARITY_BELOW_THRESHOLD,
      triggeredBy: 'parity_percent',
    };
  }
  if (health.operationalHealth === 'RED') {
    return {
      required: true,
      reason: ROLLOUT_ROLLBACK_REASONS.OPERATIONAL_RED,
      triggeredBy: 'operational_health',
    };
  }
  if (health.fallbackRatePercent > thresholds.maxFallbackRatePercent) {
    return {
      required: true,
      reason: ROLLOUT_ROLLBACK_REASONS.FALLBACK_RATE_EXCEEDED,
      triggeredBy: 'fallback_rate',
    };
  }
  if (health.p95LatencyMs > thresholds.maxP95LatencyMs) {
    return {
      required: true,
      reason: ROLLOUT_ROLLBACK_REASONS.LATENCY_EXCEEDED,
      triggeredBy: 'p95_latency',
    };
  }
  return { required: false, reason: 'No rollback required', triggeredBy: 'none' };
}

export function evaluateRolloutPromotion(
  context: RolloutPolicyContext
): RolloutPromotionDecision {
  const thresholds = context.thresholds ?? DEFAULT_ROLLOUT_THRESHOLDS;
  const toStage = getNextRolloutStage(context.currentStage);
  const blockers: string[] = [];

  if (!context.rolloutFlagEnabled) {
    blockers.push(ROLLOUT_BLOCK_REASONS.FLAG_DISABLED);
  }
  if (!context.manualApprovalGranted) {
    blockers.push(ROLLOUT_BLOCK_REASONS.MANUAL_APPROVAL_REQUIRED);
  }
  if (!context.health.projectionReady) {
    blockers.push(ROLLOUT_BLOCK_REASONS.PROJECTION_NOT_READY);
  }
  if (context.health.operationalHealth !== 'GREEN') {
    blockers.push(ROLLOUT_BLOCK_REASONS.OPERATIONAL_NOT_GREEN);
  }
  if (!context.health.projectionRepositoryHealthy) {
    blockers.push(ROLLOUT_BLOCK_REASONS.REPOSITORY_UNHEALTHY);
  }
  if (context.health.fallbackRatePercent > thresholds.maxFallbackRatePercent) {
    blockers.push(ROLLOUT_BLOCK_REASONS.FALLBACK_SPIKE);
  }
  if (context.health.telemetryHealthScore < thresholds.minTelemetryHealthScore) {
    blockers.push(ROLLOUT_BLOCK_REASONS.TELEMETRY_UNHEALTHY);
  }

  const rollback = evaluateRolloutRollback(context.health, thresholds);
  if (rollback.required) {
    blockers.push(ROLLOUT_BLOCK_REASONS.AUTOMATIC_ROLLBACK);
  }

  if (!toStage) {
    return {
      allowed: false,
      fromStage: context.currentStage,
      toStage: null,
      reason: 'Already at maximum rollout stage',
      blockers,
    };
  }

  return {
    allowed: blockers.length === 0,
    fromStage: context.currentStage,
    toStage,
    reason:
      blockers.length === 0
        ? `Promotion to stage ${toStage} allowed`
        : 'Promotion blocked — requirements not met',
    blockers,
  };
}

export function evaluateRolloutRouting(
  context: RolloutRoutingContext
): RolloutRoutingDecision {
  const thresholds = context.thresholds ?? DEFAULT_ROLLOUT_THRESHOLDS;
  const stageDef = getRolloutStageDefinition(context.currentStage);

  if (!context.rolloutFlagEnabled) {
    return {
      route: 'legacy',
      stage: context.currentStage,
      reason: ROLLOUT_BLOCK_REASONS.FLAG_DISABLED,
      rollback: false,
    };
  }

  const rollback = evaluateRolloutRollback(context.health, thresholds);
  if (rollback.required) {
    return {
      route: 'legacy',
      stage: context.currentStage,
      reason: rollback.reason,
      rollback: true,
    };
  }

  if (stageDef.projectionPercent === 0) {
    return {
      route: 'legacy',
      stage: context.currentStage,
      reason: ROLLOUT_BLOCK_REASONS.STAGE_ZERO,
      rollback: false,
    };
  }

  if (
    !context.health.projectionReady ||
    context.health.operationalHealth !== 'GREEN' ||
    !context.health.projectionRepositoryHealthy
  ) {
    return {
      route: 'legacy',
      stage: context.currentStage,
      reason: ROLLOUT_BLOCK_REASONS.AUTOMATIC_ROLLBACK,
      rollback: true,
    };
  }

  const bucket = stableBucket(context.routingKey);
  if (bucket < stageDef.projectionPercent) {
    return {
      route: 'projection',
      stage: context.currentStage,
      reason: `Stage ${context.currentStage} bucket ${bucket} < ${stageDef.projectionPercent}%`,
      rollback: false,
      bucket,
    };
  }

  return {
    route: 'legacy',
    stage: context.currentStage,
    reason: `Stage ${context.currentStage} bucket ${bucket} >= ${stageDef.projectionPercent}%`,
    rollback: false,
    bucket,
  };
}
