/** Pricing projection switch readiness rules (M8 PR-13). Pure domain — no SDK imports. */

import {
  PRICING_CERTIFICATION_BLOCK_REASONS,
  PRICING_CERTIFICATION_GO_NO_GO,
} from './PricingCertificationMetadata';
import type { PricingCertificationEvidenceBundle } from './PricingCertificationEvidence';
import type {
  PricingCertificationDecisionPackage,
  PricingCertificationGoNoGo,
  PricingCertificationStatus,
  PricingSwitchReadinessAssessment,
} from './PricingCertificationStatus';
import type { PricingCertificationThresholds } from './PricingCertificationThresholds';
import { DEFAULT_PRICING_CERTIFICATION_THRESHOLDS } from './PricingCertificationThresholds';

export interface PricingReadinessContext {
  readonly certificationFlagEnabled: boolean;
  readonly evidence: PricingCertificationEvidenceBundle;
  readonly thresholds?: PricingCertificationThresholds;
}

function collectBlockers(
  context: PricingReadinessContext,
  thresholds: PricingCertificationThresholds
): string[] {
  const { evidence } = context;
  const blockers: string[] = [];

  if (!context.certificationFlagEnabled) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.FLAG_DISABLED);
  }
  if (!evidence.parity.certified) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.PARITY_NOT_CERTIFIED);
  } else if (evidence.parity.parityPercent < thresholds.minParityPercent) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.PARITY_BELOW_READY);
  }
  if (evidence.operational.health !== 'GREEN') {
    if (evidence.operational.health === 'AMBER') {
      blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_AMBER);
    } else {
      blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_NOT_GREEN);
    }
  }
  if (!evidence.soak.soakComplete || evidence.soak.soakHours < thresholds.minStagingSoakHours) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.SOAK_INCOMPLETE);
  }
  if (evidence.replay.replaySuccessPercent < thresholds.minReplaySuccessPercent) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.REPLAY_BELOW_THRESHOLD);
  }
  if (evidence.rollback.rollbackRatePercent > thresholds.maxRollbackRatePercent) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.ROLLBACK_RATE_EXCEEDED);
  }
  if (evidence.lag.maximumLagMs > thresholds.maxProjectionLagMs) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.LAG_EXCEEDED);
  }
  if (evidence.drift.unresolvedCriticalCount > 0) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.CRITICAL_DRIFT);
  }
  if (!evidence.governance.arbApprovalRecorded) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.ARB_NOT_APPROVED);
  }
  if (!evidence.projectionHealth.repositoryHealthy) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.REPOSITORY_UNHEALTHY);
  }
  if (!evidence.rollout.rolloutHealthy) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.ROLLOUT_UNHEALTHY);
  }
  if (evidence.rollout.fallbackRatePercent > thresholds.maxFallbackRatePercent) {
    blockers.push(PRICING_CERTIFICATION_BLOCK_REASONS.ROLLOUT_UNHEALTHY);
  }

  return blockers;
}

function collectWarnings(evidence: PricingCertificationEvidenceBundle): string[] {
  const warnings: string[] = [];
  if (evidence.governance.manualProductionApprovalGranted) {
    warnings.push(PRICING_CERTIFICATION_BLOCK_REASONS.PRODUCTION_ALREADY_APPROVED);
  }
  if (evidence.operational.health === 'AMBER') {
    warnings.push('Operational health is AMBER');
  }
  if (evidence.rollout.currentStage > 0 && evidence.rollout.fallbackRatePercent > 0) {
    warnings.push('Rollout fallback rate above zero');
  }
  return warnings;
}

function resolveGoNoGo(status: PricingCertificationStatus): PricingCertificationGoNoGo {
  if (status === 'READY') return 'GO';
  if (status === 'CONDITIONAL') return 'CONDITIONAL_GO';
  return 'NO_GO';
}

function resolveRecommendation(status: PricingCertificationStatus): string {
  if (status === 'READY') return PRICING_CERTIFICATION_GO_NO_GO.GO;
  if (status === 'CONDITIONAL') return PRICING_CERTIFICATION_GO_NO_GO.CONDITIONAL_GO;
  return PRICING_CERTIFICATION_GO_NO_GO.NO_GO;
}

export function evaluatePricingCertificationStatus(
  context: PricingReadinessContext
): PricingCertificationStatus {
  const thresholds = context.thresholds ?? DEFAULT_PRICING_CERTIFICATION_THRESHOLDS;
  const blockers = collectBlockers(context, thresholds);
  const { evidence } = context;

  if (!context.certificationFlagEnabled) return 'NOT_READY';

  const criticalBlockers = blockers.filter(
    (reason) => reason !== PRICING_CERTIFICATION_BLOCK_REASONS.FLAG_DISABLED
  );

  const readyGates =
    evidence.parity.certified &&
    evidence.parity.parityPercent >= thresholds.minParityPercent &&
    evidence.operational.health === 'GREEN' &&
    evidence.soak.soakComplete &&
    evidence.soak.soakHours >= thresholds.minStagingSoakHours &&
    evidence.replay.replaySuccessPercent >= thresholds.minReplaySuccessPercent &&
    evidence.rollback.rollbackRatePercent <= thresholds.maxRollbackRatePercent &&
    evidence.lag.maximumLagMs <= thresholds.maxProjectionLagMs &&
    evidence.drift.unresolvedCriticalCount === 0 &&
    evidence.governance.arbApprovalRecorded &&
    evidence.projectionHealth.repositoryHealthy &&
    evidence.rollout.rolloutHealthy &&
    evidence.rollout.fallbackRatePercent <= thresholds.maxFallbackRatePercent &&
    !evidence.governance.manualProductionApprovalGranted;

  if (readyGates && criticalBlockers.length === 0) {
    return 'READY';
  }

  const hasCriticalFailure =
    !evidence.parity.certified ||
    evidence.operational.health === 'RED' ||
    !evidence.soak.soakComplete ||
    evidence.soak.soakHours < thresholds.minStagingSoakHours ||
    evidence.replay.replaySuccessPercent < thresholds.minReplaySuccessPercent ||
    evidence.rollback.rollbackRatePercent > thresholds.maxRollbackRatePercent ||
    evidence.lag.maximumLagMs > thresholds.maxProjectionLagMs ||
    evidence.drift.unresolvedCriticalCount > 0 ||
    !evidence.governance.arbApprovalRecorded ||
    !evidence.projectionHealth.repositoryHealthy ||
    !evidence.rollout.rolloutHealthy ||
    evidence.governance.manualProductionApprovalGranted;

  if (hasCriticalFailure) {
    return 'NOT_READY';
  }

  const conditionalGates =
    evidence.parity.parityPercent >= thresholds.conditionalMinParityPercent &&
    evidence.operational.health !== 'RED' &&
    evidence.projectionHealth.repositoryHealthy &&
    criticalBlockers.length > 0;

  if (conditionalGates) {
    return 'CONDITIONAL';
  }

  return 'NOT_READY';
}

export function assessPricingSwitchReadiness(
  context: PricingReadinessContext,
  assessedAt: string
): PricingSwitchReadinessAssessment {
  const thresholds = context.thresholds ?? DEFAULT_PRICING_CERTIFICATION_THRESHOLDS;
  const status = evaluatePricingCertificationStatus(context);
  const blockers = collectBlockers(context, thresholds);

  return {
    status,
    goNoGo: resolveGoNoGo(status),
    recommendation: resolveRecommendation(status),
    blockers,
    assessedAt,
  };
}

export function buildPricingCertificationDecisionPackage(
  certificationId: string,
  context: PricingReadinessContext,
  generatedAt: string
): PricingCertificationDecisionPackage {
  const assessment = assessPricingSwitchReadiness(context, generatedAt);
  const warnings = collectWarnings(context.evidence);

  return {
    certificationId,
    status: assessment.status,
    goNoGo: assessment.goNoGo,
    recommendation: assessment.recommendation,
    blockers: assessment.blockers,
    warnings,
    legacyAuthoritative: true,
    productionActivationProhibited: true,
    generatedAt,
  };
}
