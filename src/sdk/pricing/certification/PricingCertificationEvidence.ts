/**
 * Pricing certification evidence collector (M8 PR-13).
 */

import type { PricingCertificationEvidencePort } from './pricingCertificationPorts';
import type { PricingCertificationEvidenceBundle } from '../../../domain/pricing/certification/PricingCertificationEvidence';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class PricingCertificationEvidenceCollector implements PricingCertificationEvidencePort {
  constructor(private readonly evidence: PricingCertificationEvidenceBundle) {}

  collectEvidence(): SdkAsyncResult<PricingCertificationEvidenceBundle> {
    return Promise.resolve(sdkOk(this.evidence));
  }
}

export function createPricingCertificationEvidenceCollector(
  evidence: PricingCertificationEvidenceBundle
): PricingCertificationEvidenceCollector {
  return new PricingCertificationEvidenceCollector(evidence);
}

export function createHealthyPricingCertificationEvidence(
  overrides: Partial<PricingCertificationEvidenceBundle> = {}
): PricingCertificationEvidenceBundle {
  const base: PricingCertificationEvidenceBundle = {
    parity: {
      certified: true,
      parityPercent: 100,
      certificationId: 'pricing-parity-cert-001',
    },
    operational: {
      health: 'GREEN',
      reportId: 'pricing-ops-report-001',
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
      soakCertificationId: 'pricing-soak-cert-001',
    },
    drift: {
      unresolvedCriticalCount: 0,
      totalDriftEvents: 0,
    },
    governance: {
      arbApprovalRecorded: true,
      arbApprovalId: 'pricing-arb-001',
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
