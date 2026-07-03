import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assessPricingSwitchReadiness,
  buildPricingCertificationDecisionPackage,
  evaluatePricingCertificationStatus,
} from '../PricingProjectionReadinessRules';
import { PRICING_CERTIFICATION_BLOCK_REASONS } from '../PricingCertificationMetadata';
import type { PricingCertificationEvidenceBundle } from '../PricingCertificationEvidence';

const healthyEvidence = (): PricingCertificationEvidenceBundle => ({
  parity: { certified: true, parityPercent: 100, certificationId: 'parity-1' },
  operational: { health: 'GREEN', reportId: 'ops-1' },
  rollout: { currentStage: 0, fallbackRatePercent: 0, totalRequests: 0, rolloutHealthy: true },
  rollback: { rollbackCount: 0, totalRequests: 1000, rollbackRatePercent: 0 },
  projectionHealth: { repositoryHealthy: true, healthScore: 100 },
  lag: { maximumLagMs: 500, p95LagMs: 200 },
  replay: { replayAttempts: 100, replaySuccesses: 100, replaySuccessPercent: 100 },
  soak: { soakComplete: true, soakHours: 72, soakCertificationId: 'soak-1' },
  drift: { unresolvedCriticalCount: 0, totalDriftEvents: 0 },
  governance: {
    arbApprovalRecorded: true,
    arbApprovalId: 'arb-1',
    manualProductionApprovalGranted: false,
  },
  collectedAt: '2026-07-03T00:00:00.000Z',
});

describe('Pricing certification domain (M8 PR-13)', () => {
  it('evaluates READY when all gates pass', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: healthyEvidence(),
    });
    assert.equal(status, 'READY');
  });

  it('evaluates NOT_READY when flag disabled', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: false,
      evidence: healthyEvidence(),
    });
    assert.equal(status, 'NOT_READY');
  });

  it('evaluates NOT_READY when parity not certified', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: {
        ...healthyEvidence(),
        parity: { certified: false, parityPercent: 80 },
      },
    });
    assert.equal(status, 'NOT_READY');
  });

  it('evaluates NOT_READY when soak incomplete', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: {
        ...healthyEvidence(),
        soak: { soakComplete: false, soakHours: 24 },
      },
    });
    assert.equal(status, 'NOT_READY');
  });

  it('evaluates NOT_READY when governance not approved', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: {
        ...healthyEvidence(),
        governance: {
          arbApprovalRecorded: false,
          manualProductionApprovalGranted: false,
        },
      },
    });
    assert.equal(status, 'NOT_READY');
  });

  it('evaluates NOT_READY when critical drift unresolved', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: {
        ...healthyEvidence(),
        drift: { unresolvedCriticalCount: 2, totalDriftEvents: 5 },
      },
    });
    assert.equal(status, 'NOT_READY');
  });

  it('evaluates NOT_READY when rollout unhealthy', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: {
        ...healthyEvidence(),
        rollout: {
          currentStage: 1,
          fallbackRatePercent: 0,
          totalRequests: 100,
          rolloutHealthy: false,
        },
      },
    });
    assert.equal(status, 'NOT_READY');
  });

  it('assessment includes blockers for failed gates', () => {
    const assessment = assessPricingSwitchReadiness(
      {
        certificationFlagEnabled: true,
        evidence: {
          ...healthyEvidence(),
          operational: { health: 'RED' },
        },
      },
      '2026-07-03T00:00:00.000Z'
    );
    assert.equal(assessment.status, 'NOT_READY');
    assert.equal(assessment.goNoGo, 'NO_GO');
    assert.ok(
      assessment.blockers.includes(PRICING_CERTIFICATION_BLOCK_REASONS.OPERATIONAL_NOT_GREEN)
    );
  });

  it('evaluates CONDITIONAL when parity below ready but above conditional threshold', () => {
    const status = evaluatePricingCertificationStatus({
      certificationFlagEnabled: true,
      evidence: {
        ...healthyEvidence(),
        parity: { certified: true, parityPercent: 97, certificationId: 'parity-1' },
      },
    });
    assert.equal(status, 'CONDITIONAL');
  });

  it('decision package prohibits production activation', () => {
    const decision = buildPricingCertificationDecisionPackage(
      'pricing-cert-domain-001',
      {
        certificationFlagEnabled: true,
        evidence: healthyEvidence(),
      },
      '2026-07-03T00:00:00.000Z'
    );
    assert.equal(decision.status, 'READY');
    assert.equal(decision.goNoGo, 'GO');
    assert.equal(decision.legacyAuthoritative, true);
    assert.equal(decision.productionActivationProhibited, true);
  });
});
