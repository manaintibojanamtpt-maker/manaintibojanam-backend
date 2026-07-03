import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMenuCertificationInfrastructure,
  createHealthyMenuCertificationEvidence,
  createMenuProjectionCertification,
} from '../menu/certification/MenuCertificationFactory';
import {
  MENU_CERTIFICATION_FEATURE_FLAG_DEFAULTS,
  type MenuCertificationFeatureFlagReader,
} from '../menu/certification/menuCertificationFeatureFlags';
import type { MenuCertificationTelemetryEvent } from '../menu/certification/MenuCertificationTelemetry';
import { MENU_CERTIFICATION_BLOCK_REASONS } from '../../domain/menu/certification/MenuCertificationMetadata';

const CERT_ON: MenuCertificationFeatureFlagReader = () => true;
const CERT_OFF: MenuCertificationFeatureFlagReader = () => false;

describe('Menu projection switch certification SDK (M7 PR-13)', () => {
  it('defaults certification flag to OFF', () => {
    assert.equal(
      MENU_CERTIFICATION_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_CERTIFICATION_ENABLED,
      false
    );
  });

  it('createMenuProjectionCertification resolves infrastructure', () => {
    const infra = createMenuCertificationInfrastructure({
      evidence: createHealthyMenuCertificationEvidence(),
    });
    const cert = createMenuProjectionCertification({
      evidence: infra.evidence,
      report: infra.report,
      repository: infra.repository,
      evaluator: infra.evaluator,
    });
    assert.ok(cert);
  });

  it('certifies NOT_READY when flag is off', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_OFF,
      evidence: createHealthyMenuCertificationEvidence(),
    });

    const result = await infra.certification.certify('menu-cert-flag-off');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
      assert.equal(result.value.goNoGo, 'NO_GO');
      assert.equal(result.value.productionActivationProhibited, true);
      assert.equal(result.value.legacyAuthoritative, true);
    }
  });

  it('certifies READY when all evidence passes and flag on', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence(),
    });

    const result = await infra.certification.certify('menu-cert-ready-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'READY');
      assert.equal(result.value.goNoGo, 'GO');
      assert.equal(result.value.legacyAuthoritative, true);
    }
  });

  it('certifies CONDITIONAL when parity below ready threshold', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence({
        parity: { certified: true, parityPercent: 97, certificationId: 'parity-1' },
      }),
    });

    const result = await infra.certification.certify('menu-cert-conditional');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'CONDITIONAL');
      assert.equal(result.value.goNoGo, 'CONDITIONAL_GO');
    }
  });

  it('persists certification record in repository', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence(),
    });

    await infra.certification.certify('menu-cert-persist-001');
    const latest = await infra.certification.getLatest();
    assert.equal(latest.ok, true);
    if (latest.ok) {
      assert.equal(latest.value?.certificationId, 'menu-cert-persist-001');
      assert.equal(latest.value?.status, 'READY');
    }
  });

  it('certifies NOT_READY when replay below threshold', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence({
        replay: {
          replayAttempts: 100,
          replaySuccesses: 90,
          replaySuccessPercent: 90,
        },
      }),
    });

    const result = await infra.certification.certify('menu-cert-replay-fail');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
      assert.ok(
        result.value.blockers.includes(MENU_CERTIFICATION_BLOCK_REASONS.REPLAY_BELOW_THRESHOLD)
      );
    }
  });

  it('certifies NOT_READY when rollback rate exceeds threshold', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence({
        rollback: {
          rollbackCount: 50,
          totalRequests: 1000,
          rollbackRatePercent: 5,
        },
      }),
    });

    const result = await infra.certification.certify('menu-cert-rollback-fail');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
    }
  });

  it('certifies NOT_READY when lag exceeds threshold', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence({
        lag: { maximumLagMs: 60_000, p95LagMs: 40_000 },
      }),
    });

    const result = await infra.certification.certify('menu-cert-lag-fail');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
      assert.ok(result.value.blockers.includes(MENU_CERTIFICATION_BLOCK_REASONS.LAG_EXCEEDED));
    }
  });

  it('emits certification telemetry events', async () => {
    const events: MenuCertificationTelemetryEvent[] = [];
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence(),
      onTelemetry: (event) => events.push(event),
    });

    await infra.certification.certify('menu-cert-telemetry');

    assert.ok(events.some((event) => event.type === 'menu_projection_certification_started'));
    assert.ok(events.some((event) => event.type === 'menu_projection_certification_completed'));
    assert.ok(events.some((event) => event.type === 'menu_projection_certification_ready'));
  });

  it('report generator returns assessment', async () => {
    const infra = createMenuCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyMenuCertificationEvidence(),
    });

    const evidence = await infra.evidence.collectEvidence();
    assert.equal(evidence.ok, true);
    if (evidence.ok) {
      const assessment = await infra.report.getAssessment(evidence.value);
      assert.equal(assessment.ok, true);
      if (assessment.ok) {
        assert.equal(assessment.value.status, 'READY');
      }
    }
  });
});
