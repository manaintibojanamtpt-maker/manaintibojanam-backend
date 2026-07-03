import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createProjectionCertificationInfrastructure,
  createHealthyCertificationEvidence,
} from '../order/certification/ProjectionCertificationFactory';
import {
  PROJECTION_CERTIFICATION_FEATURE_FLAG_DEFAULTS,
  type ProjectionCertificationFeatureFlagReader,
} from '../order/certification/certificationFeatureFlags';
import type { ProjectionCertificationTelemetryEvent } from '../order/certification/ProjectionCertificationTelemetry';

const CERT_ON: ProjectionCertificationFeatureFlagReader = () => true;
const CERT_OFF: ProjectionCertificationFeatureFlagReader = () => false;

describe('Projection switch certification SDK (M6 PR-13)', () => {
  it('defaults certification flag to OFF', () => {
    assert.equal(
      PROJECTION_CERTIFICATION_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_PROJECTION_CERTIFICATION_ENABLED,
      false
    );
  });

  it('certifies NOT_READY when flag is off', async () => {
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_OFF,
      evidence: createHealthyCertificationEvidence(),
    });

    const result = await infra.certification.certify('cert-flag-off');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
      assert.equal(result.value.goNoGo, 'NO_GO');
      assert.equal(result.value.productionActivationProhibited, true);
    }
  });

  it('certifies READY when all evidence passes and flag on', async () => {
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyCertificationEvidence(),
    });

    const result = await infra.certification.certify('cert-ready-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'READY');
      assert.equal(result.value.goNoGo, 'GO');
      assert.equal(result.value.legacyAuthoritative, true);
    }
  });

  it('persists certification record in repository', async () => {
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyCertificationEvidence(),
    });

    await infra.certification.certify('cert-persist-001');
    const latest = await infra.certification.getLatest();
    assert.equal(latest.ok, true);
    if (latest.ok) {
      assert.equal(latest.value?.certificationId, 'cert-persist-001');
      assert.equal(latest.value?.status, 'READY');
    }
  });

  it('certifies NOT_READY when replay below threshold', async () => {
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyCertificationEvidence({
        replay: {
          replayAttempts: 100,
          replaySuccesses: 90,
          replaySuccessPercent: 90,
        },
      }),
    });

    const result = await infra.certification.certify('cert-replay-fail');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
    }
  });

  it('certifies NOT_READY when rollback rate exceeds threshold', async () => {
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyCertificationEvidence({
        rollback: {
          rollbackCount: 50,
          totalRequests: 1000,
          rollbackRatePercent: 5,
        },
      }),
    });

    const result = await infra.certification.certify('cert-rollback-fail');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.status, 'NOT_READY');
    }
  });

  it('emits certification telemetry events', async () => {
    const events: ProjectionCertificationTelemetryEvent[] = [];
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyCertificationEvidence(),
      onTelemetry: (event) => events.push(event),
    });

    await infra.certification.certify('cert-telemetry');

    assert.ok(events.some((event) => event.type === 'projection_certification_started'));
    assert.ok(events.some((event) => event.type === 'projection_certification_completed'));
    assert.ok(events.some((event) => event.type === 'projection_certification_ready'));
  });

  it('report generator returns assessment', async () => {
    const infra = createProjectionCertificationInfrastructure({
      featureFlags: CERT_ON,
      evidence: createHealthyCertificationEvidence(),
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
