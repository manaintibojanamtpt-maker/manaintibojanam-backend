/**
 * Menu certification evidence collector (M7 PR-13).
 */

import type { MenuCertificationEvidencePort } from './menuCertificationPorts';
import type { MenuCertificationEvidenceBundle } from '../../../domain/menu/certification/MenuCertificationEvidence';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class MenuCertificationEvidenceCollector implements MenuCertificationEvidencePort {
  constructor(private readonly evidence: MenuCertificationEvidenceBundle) {}

  collectEvidence(): SdkAsyncResult<MenuCertificationEvidenceBundle> {
    return Promise.resolve(sdkOk(this.evidence));
  }
}

export function createMenuCertificationEvidenceCollector(
  evidence: MenuCertificationEvidenceBundle
): MenuCertificationEvidenceCollector {
  return new MenuCertificationEvidenceCollector(evidence);
}

export function createHealthyMenuCertificationEvidence(
  overrides: Partial<MenuCertificationEvidenceBundle> = {}
): MenuCertificationEvidenceBundle {
  const base: MenuCertificationEvidenceBundle = {
    parity: {
      certified: true,
      parityPercent: 100,
      certificationId: 'menu-parity-cert-001',
    },
    operational: {
      health: 'GREEN',
      reportId: 'menu-ops-report-001',
    },
    rollout: {
      currentStage: 0,
      fallbackRatePercent: 0,
      totalRequests: 0,
      rolloutHealthy: true,
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
      soakCertificationId: 'menu-soak-cert-001',
    },
    drift: {
      unresolvedCriticalCount: 0,
      totalDriftEvents: 0,
    },
    governance: {
      arbApprovalRecorded: true,
      arbApprovalId: 'menu-arb-001',
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
