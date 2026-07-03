import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createProjectionOperationalInfrastructure,
  InMemoryProjectionOperationalSampleSource,
} from '../events/operations/ProjectionOperationalFactory';
import type { ProjectionOperationalSample } from '../../domain/events/operations/ProjectionOperationalRules';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { ProjectionOperationalTelemetryEvent } from '../events/operations/ProjectionOperationalTelemetry';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';

const OPS_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_RUNTIME_ENABLED' ||
  flag === 'FF_ORDER_READ_PROJECTION_ENABLED' ||
  flag === 'FF_ORDER_PROJECTION_PARITY_ENABLED' ||
  flag === 'FF_ORDER_PROJECTION_SOAK_ENABLED' ||
  flag === 'FF_EVENT_OPERATIONAL_VALIDATION_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-27T00:00:10.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `ops-${++n}`;
  })(),
};

const healthySample = (
  index: number,
  overrides: Partial<ProjectionOperationalSample> = {}
): ProjectionOperationalSample => ({
  projectionName: 'order-read-shadow',
  processedEvents: 1000 + index,
  failedEvents: 0,
  duplicateEvents: 0,
  droppedEvents: 0,
  missingEvents: 0,
  outOfOrderEvents: 0,
  replayAttempts: 100,
  replaySuccesses: 100,
  processingLatenciesMs: [20, 30, 40, 50, 60, 70, 80, 90, 100],
  checkpointUpdatedAt: '2026-06-27T00:00:00.000Z',
  workerStartedAt: '2026-06-26T23:00:00.000Z',
  lastEventProcessedAt: '2026-06-27T00:00:00.000Z',
  evaluatedAt: `2026-06-27T00:00:0${index % 10}.000Z`,
  windowDurationMs: 3_600_000,
  ...overrides,
});

describe('EventSDK projection operational validation (M6 PR-10)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_EVENT_OPERATIONAL_VALIDATION_ENABLED to off', () => {
    assert.equal(
      EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_OPERATIONAL_VALIDATION_ENABLED,
      false
    );
  });

  it('validate skips when flags off', async () => {
    const source = new InMemoryProjectionOperationalSampleSource();
    source.seed(healthySample(1));

    const ops = createProjectionOperationalInfrastructure({
      sampleSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await ops.validate('order-read-shadow');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('requires all seven flags including FF_EVENT_OPERATIONAL_VALIDATION_ENABLED', async () => {
    const sixFlagsOnly: EventFeatureFlagReader = (flag) =>
      flag !== 'FF_EVENT_OPERATIONAL_VALIDATION_ENABLED' && OPS_FLAGS(flag);

    const source = new InMemoryProjectionOperationalSampleSource();
    source.seed(healthySample(1));

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: sixFlagsOnly,
      sampleSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await ops.validate('order-read-shadow');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('validate produces READY_FOR_SWITCH for healthy staging samples', async () => {
    const telemetry: ProjectionOperationalTelemetryEvent[] = [];
    const source = new InMemoryProjectionOperationalSampleSource();
    source.seedMany(Array.from({ length: 12 }, (_, i) => healthySample(i)));

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: OPS_FLAGS,
      sampleSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await ops.validate('order-read-shadow');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.report.readiness, 'READY_FOR_SWITCH');
      assert.equal(result.value.report.health.status, 'GREEN');
      assert.equal(result.value.replayVerified, true);
      assert.equal(result.value.driftDetected, false);
      assert.ok(result.value.report.metrics.projectionThroughputPerMinute > 0);
    }

    const dashboard = await ops.dashboard('order-read-shadow');
    assert.equal(dashboard.ok, true);
    if (dashboard.ok) assert.ok(dashboard.value);

    assert.ok(telemetry.some((e) => e.type === 'projection_operational_started'));
    assert.ok(telemetry.some((e) => e.type === 'projection_replay_verified'));
    assert.ok(telemetry.some((e) => e.type === 'projection_health_updated'));
    assert.ok(telemetry.some((e) => e.type === 'projection_operational_completed'));
  });

  it('detects lag and emits telemetry when lag exceeds threshold', async () => {
    const telemetry: ProjectionOperationalTelemetryEvent[] = [];
    const source = new InMemoryProjectionOperationalSampleSource();
    source.seedMany(
      Array.from({ length: 10 }, (_, i) =>
        healthySample(i, {
          lastEventProcessedAt: '2026-06-26T23:00:00.000Z',
          evaluatedAt: '2026-06-27T00:01:00.000Z',
        })
      )
    );

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: OPS_FLAGS,
      sampleSource: source,
      thresholds: { minSampleSize: 5, maxLagMs: 1000 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await ops.validate('order-read-shadow');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.value.lag.currentLagMs > 1000);
      assert.equal(result.value.report.readiness, 'REQUIRES_INVESTIGATION');
    }

    assert.ok(telemetry.some((e) => e.type === 'projection_lag_detected'));
  });

  it('returns REQUIRES_INVESTIGATION when drift detected', async () => {
    const source = new InMemoryProjectionOperationalSampleSource();
    const driftSample = healthySample(0, {
      duplicateEvents: 20,
      missingEvents: 3,
      outOfOrderEvents: 2,
    });
    source.seedMany(Array.from({ length: 10 }, () => driftSample));

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: OPS_FLAGS,
      sampleSource: source,
      thresholds: { minSampleSize: 5 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await ops.validate('order-read-shadow');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.driftDetected, true);
      assert.equal(result.value.report.readiness, 'REQUIRES_INVESTIGATION');
    }
  });

  it('returns NOT_READY for high latency metrics', async () => {
    const source = new InMemoryProjectionOperationalSampleSource();
    source.seedMany(
      Array.from({ length: 10 }, (_, i) =>
        healthySample(i, {
          processingLatenciesMs: [800, 900, 1200, 1500, 1800],
        })
      )
    );

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: OPS_FLAGS,
      sampleSource: source,
      thresholds: { minSampleSize: 5, maxP95LatencyMs: 500 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await ops.validate('order-read-shadow');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(['AMBER', 'RED'].includes(result.value.report.health.status));
      assert.ok(['NOT_READY', 'REQUIRES_INVESTIGATION'].includes(result.value.report.readiness));
    }
  });

  it('persists operational report and lag records', async () => {
    const source = new InMemoryProjectionOperationalSampleSource();
    source.seedMany(Array.from({ length: 10 }, (_, i) => healthySample(i)));

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: OPS_FLAGS,
      sampleSource: source,
      thresholds: { minSampleSize: 5 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await ops.validate('order-read-shadow');

    const reportCount = await ops.operationalRepository.count();
    assert.equal(reportCount.ok, true);
    if (reportCount.ok) assert.equal(reportCount.value, 1);

    const maxLag = await ops.lagRepository.getMaximumLag('order-read-shadow');
    assert.equal(maxLag.ok, true);
    if (maxLag.ok) assert.ok(maxLag.value >= 0);
  });

  it('returns NOT_FOUND when projection has no samples', async () => {
    const source = new InMemoryProjectionOperationalSampleSource();
    source.seed(healthySample(1));

    const ops = createProjectionOperationalInfrastructure({
      featureFlags: OPS_FLAGS,
      sampleSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await ops.validate('unknown-projection');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_FOUND');
  });
});
