/**
 * Projection certification evidence collector (M6 PR-13).
 */

import type { ProjectionCertificationEvidencePort } from './projectionCertificationPorts';
import type { ProjectionCertificationEvidenceBundle } from '../../../domain/order/certification/ProjectionCertificationEvidence';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class ProjectionCertificationEvidenceCollector implements ProjectionCertificationEvidencePort {
  constructor(private readonly evidence: ProjectionCertificationEvidenceBundle) {}

  collectEvidence(): SdkAsyncResult<ProjectionCertificationEvidenceBundle> {
    return Promise.resolve(sdkOk(this.evidence));
  }
}

export function createProjectionCertificationEvidenceCollector(
  evidence: ProjectionCertificationEvidenceBundle
): ProjectionCertificationEvidenceCollector {
  return new ProjectionCertificationEvidenceCollector(evidence);
}

export function createHealthyCertificationEvidence(
  overrides: Partial<ProjectionCertificationEvidenceBundle> = {}
): ProjectionCertificationEvidenceBundle {
  const base: ProjectionCertificationEvidenceBundle = {
    parity: {
      certified: true,
      parityPercent: 100,
      certificationId: 'parity-cert-001',
    },
    operational: {
      health: 'GREEN',
      reportId: 'ops-report-001',
    },
    rollout: {
      currentStage: 0,
      fallbackRatePercent: 0,
      totalRequests: 0,
    },
    rollback: {
      rollbackCount: 0,
      totalRequests: 1000,
      rollbackRatePercent: 0,
    },
    projectionHealth: {
      repositoryHealthy: true,
      healthScore: 100,
    },
    lag: {
      maximumLagMs: 500,
      p95LagMs: 200,
    },
    replay: {
      replayAttempts: 100,
      replaySuccesses: 100,
      replaySuccessPercent: 100,
    },
    soak: {
      soakComplete: true,
      soakHours: 72,
      soakCertificationId: 'soak-cert-001',
    },
    drift: {
      unresolvedCriticalCount: 0,
      totalDriftEvents: 0,
    },
    governance: {
      arbApprovalRecorded: true,
      arbApprovalId: 'arb-001',
      manualProductionApprovalGranted: false,
    },
    collectedAt: new Date(0).toISOString(),
  };

  return {
    ...base,
    ...overrides,
    parity: { ...base.parity, ...overrides.parity },
    operational: { ...base.operational, ...overrides.operational },
    rollout: { ...base.rollout, ...overrides.rollout },
    rollback: { ...base.rollback, ...overrides.rollback },
    projectionHealth: { ...base.projectionHealth, ...overrides.projectionHealth },
    lag: { ...base.lag, ...overrides.lag },
    replay: { ...base.replay, ...overrides.replay },
    soak: { ...base.soak, ...overrides.soak },
    drift: { ...base.drift, ...overrides.drift },
    governance: { ...base.governance, ...overrides.governance },
  };
}
