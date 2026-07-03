/** Menu projection switch readiness rules (M7 PR-13). Pure domain — no SDK imports. */

import { MENU_CERTIFICATION_BLOCK_REASONS, MENU_CERTIFICATION_GO_NO_GO } from './MenuCertificationMetadata';
import type { MenuCertificationEvidenceBundle } from './MenuCertificationEvidence';
import type {
  MenuCertificationDecisionPackage,
  MenuCertificationGoNoGo,
  MenuCertificationStatus,
  MenuSwitchReadinessAssessment,
} from './MenuCertificationStatus';
import type { MenuCertificationThresholds } from './MenuCertificationThresholds';
import { DEFAULT_MENU_CERTIFICATION_THRESHOLDS } from './MenuCertificationThresholds';

export interface MenuReadinessContext {
  readonly certificationFlagEnabled: boolean;
  readonly evidence: MenuCertificationEvidenceBundle;
  readonly thresholds?: MenuCertificationThresholds;
}

function collectBlockers(
  context: MenuReadinessContext,
  thresholds: MenuCertificationThresholds
): string[] {
  const { evidence } = context;
  const blockers: string[] = [];

  if (!context.certificationFlagEnabled) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.FLAG_DISABLED);
  }
  if (!evidence.parity.certified) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.PARITY_NOT_CERTIFIED);
  } else if (evidence.parity.parityPercent < thresholds.minParityPercent) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.PARITY_BELOW_READY);
  }
  if (evidence.operational.health !== 'GREEN') {
    if (evidence.operational.health === 'AMBER') {
      blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_AMBER);
    } else {
      blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_NOT_GREEN);
    }
  }
  if (!evidence.soak.soakComplete || evidence.soak.soakHours < thresholds.minStagingSoakHours) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.SOAK_INCOMPLETE);
  }
  if (evidence.replay.replaySuccessPercent < thresholds.minReplaySuccessPercent) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.REPLAY_BELOW_THRESHOLD);
  }
  if (evidence.rollback.rollbackRatePercent > thresholds.maxRollbackRatePercent) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.ROLLBACK_RATE_EXCEEDED);
  }
  if (evidence.lag.maximumLagMs > thresholds.maxProjectionLagMs) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.LAG_EXCEEDED);
  }
  if (evidence.drift.unresolvedCriticalCount > 0) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.CRITICAL_DRIFT);
  }
  if (!evidence.governance.arbApprovalRecorded) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.ARB_NOT_APPROVED);
  }
  if (!evidence.projectionHealth.repositoryHealthy) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.REPOSITORY_UNHEALTHY);
  }
  if (!evidence.rollout.rolloutHealthy) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.ROLLOUT_UNHEALTHY);
  }
  if (evidence.rollout.fallbackRatePercent > thresholds.maxFallbackRatePercent) {
    blockers.push(MENU_CERTIFICATION_BLOCK_REASONS.ROLLOUT_UNHEALTHY);
  }

  return blockers;
}

function collectWarnings(evidence: MenuCertificationEvidenceBundle): string[] {
  const warnings: string[] = [];
  if (evidence.governance.manualProductionApprovalGranted) {
    warnings.push(MENU_CERTIFICATION_BLOCK_REASONS.PRODUCTION_ALREADY_APPROVED);
  }
  if (evidence.operational.health === 'AMBER') {
    warnings.push('Operational health is AMBER');
  }
  if (evidence.rollout.currentStage > 0 && evidence.rollout.fallbackRatePercent > 0) {
    warnings.push('Rollout fallback rate above zero');
  }
  return warnings;
}

function resolveGoNoGo(status: MenuCertificationStatus): MenuCertificationGoNoGo {
  if (status === 'READY') return 'GO';
  if (status === 'CONDITIONAL') return 'CONDITIONAL_GO';
  return 'NO_GO';
}

function resolveRecommendation(status: MenuCertificationStatus): string {
  if (status === 'READY') return MENU_CERTIFICATION_GO_NO_GO.GO;
  if (status === 'CONDITIONAL') return MENU_CERTIFICATION_GO_NO_GO.CONDITIONAL_GO;
  return MENU_CERTIFICATION_GO_NO_GO.NO_GO;
}

export function evaluateMenuCertificationStatus(
  context: MenuReadinessContext
): MenuCertificationStatus {
  const thresholds = context.thresholds ?? DEFAULT_MENU_CERTIFICATION_THRESHOLDS;
  const blockers = collectBlockers(context, thresholds);
  const { evidence } = context;

  if (!context.certificationFlagEnabled) return 'NOT_READY';

  const criticalBlockers = blockers.filter(
    (reason) => reason !== MENU_CERTIFICATION_BLOCK_REASONS.FLAG_DISABLED
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

export function assessMenuSwitchReadiness(
  context: MenuReadinessContext,
  assessedAt: string
): MenuSwitchReadinessAssessment {
  const thresholds = context.thresholds ?? DEFAULT_MENU_CERTIFICATION_THRESHOLDS;
  const status = evaluateMenuCertificationStatus(context);
  const blockers = collectBlockers(context, thresholds);

  return {
    status,
    goNoGo: resolveGoNoGo(status),
    recommendation: resolveRecommendation(status),
    blockers,
    assessedAt,
  };
}

export function buildMenuCertificationDecisionPackage(
  certificationId: string,
  context: MenuReadinessContext,
  generatedAt: string
): MenuCertificationDecisionPackage {
  const assessment = assessMenuSwitchReadiness(context, generatedAt);
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
