/** Projection switch readiness rules (M6 PR-13). Pure domain — no SDK imports. */

import {
  PROJECTION_CERTIFICATION_BLOCK_REASONS,
  PROJECTION_CERTIFICATION_GO_NO_GO,
} from './ProjectionCertificationMetadata';
import type { ProjectionCertificationEvidenceBundle } from './ProjectionCertificationEvidence';
import type {
  ProjectionCertificationDecisionPackage,
  ProjectionCertificationGoNoGo,
  ProjectionCertificationStatus,
  ProjectionSwitchReadinessAssessment,
} from './ProjectionCertificationStatus';
import type { ProjectionCertificationThresholds } from './ProjectionCertificationThresholds';
import { DEFAULT_PROJECTION_CERTIFICATION_THRESHOLDS } from './ProjectionCertificationThresholds';

export interface ProjectionReadinessContext {
  readonly certificationFlagEnabled: boolean;
  readonly evidence: ProjectionCertificationEvidenceBundle;
  readonly thresholds?: ProjectionCertificationThresholds;
}

function collectBlockers(
  context: ProjectionReadinessContext,
  thresholds: ProjectionCertificationThresholds
): string[] {
  const { evidence } = context;
  const blockers: string[] = [];

  if (!context.certificationFlagEnabled) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.FLAG_DISABLED);
  }
  if (!evidence.parity.certified) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.PARITY_NOT_CERTIFIED);
  } else if (evidence.parity.parityPercent < thresholds.minParityPercent) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.PARITY_BELOW_READY);
  }
  if (evidence.operational.health !== 'GREEN') {
    if (evidence.operational.health === 'AMBER') {
      blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_AMBER);
    } else {
      blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_NOT_GREEN);
    }
  }
  if (!evidence.soak.soakComplete || evidence.soak.soakHours < thresholds.minStagingSoakHours) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.SOAK_INCOMPLETE);
  }
  if (evidence.replay.replaySuccessPercent < thresholds.minReplaySuccessPercent) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.REPLAY_BELOW_THRESHOLD);
  }
  if (evidence.rollback.rollbackRatePercent > thresholds.maxRollbackRatePercent) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.ROLLBACK_RATE_EXCEEDED);
  }
  if (evidence.lag.maximumLagMs > thresholds.maxProjectionLagMs) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.LAG_EXCEEDED);
  }
  if (evidence.drift.unresolvedCriticalCount > 0) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.CRITICAL_DRIFT);
  }
  if (!evidence.governance.arbApprovalRecorded) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.ARB_NOT_APPROVED);
  }
  if (!evidence.projectionHealth.repositoryHealthy) {
    blockers.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.REPOSITORY_UNHEALTHY);
  }

  return blockers;
}

function collectWarnings(evidence: ProjectionCertificationEvidenceBundle): string[] {
  const warnings: string[] = [];
  if (evidence.governance.manualProductionApprovalGranted) {
    warnings.push(PROJECTION_CERTIFICATION_BLOCK_REASONS.PRODUCTION_ALREADY_APPROVED);
  }
  if (evidence.operational.health === 'AMBER') {
    warnings.push('Operational health is AMBER');
  }
  return warnings;
}

function resolveGoNoGo(status: ProjectionCertificationStatus): ProjectionCertificationGoNoGo {
  if (status === 'READY') return 'GO';
  if (status === 'CONDITIONAL') return 'CONDITIONAL_GO';
  return 'NO_GO';
}

function resolveRecommendation(status: ProjectionCertificationStatus): string {
  if (status === 'READY') return PROJECTION_CERTIFICATION_GO_NO_GO.GO;
  if (status === 'CONDITIONAL') return PROJECTION_CERTIFICATION_GO_NO_GO.CONDITIONAL_GO;
  return PROJECTION_CERTIFICATION_GO_NO_GO.NO_GO;
}

export function evaluateProjectionCertificationStatus(
  context: ProjectionReadinessContext
): ProjectionCertificationStatus {
  const thresholds = context.thresholds ?? DEFAULT_PROJECTION_CERTIFICATION_THRESHOLDS;
  const blockers = collectBlockers(context, thresholds);
  const { evidence } = context;

  if (!context.certificationFlagEnabled) return 'NOT_READY';

  const criticalBlockers = blockers.filter(
    (reason) => reason !== PROJECTION_CERTIFICATION_BLOCK_REASONS.FLAG_DISABLED
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

export function assessProjectionSwitchReadiness(
  context: ProjectionReadinessContext,
  assessedAt: string
): ProjectionSwitchReadinessAssessment {
  const thresholds = context.thresholds ?? DEFAULT_PROJECTION_CERTIFICATION_THRESHOLDS;
  const status = evaluateProjectionCertificationStatus(context);
  const blockers = collectBlockers(context, thresholds);

  return {
    status,
    goNoGo: resolveGoNoGo(status),
    recommendation: resolveRecommendation(status),
    blockers,
    assessedAt,
  };
}

export function buildProjectionCertificationDecisionPackage(
  certificationId: string,
  context: ProjectionReadinessContext,
  generatedAt: string
): ProjectionCertificationDecisionPackage {
  const assessment = assessProjectionSwitchReadiness(context, generatedAt);
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
