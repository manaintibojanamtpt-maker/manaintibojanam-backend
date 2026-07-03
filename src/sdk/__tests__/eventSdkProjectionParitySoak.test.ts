import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createProjectionParitySoakInfrastructure,
  InMemoryParitySoakReportSource,
} from '../events/parity/soak/ProjectionParityFactory';
import type { OrderParityReportRecord } from '../../domain/events/parity/order/OrderParityResult';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { ProjectionParitySoakTelemetryEvent } from '../events/parity/soak/ProjectionParityTelemetry';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';

const SOAK_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_RUNTIME_ENABLED' ||
  flag === 'FF_ORDER_READ_PROJECTION_ENABLED' ||
  flag === 'FF_ORDER_PROJECTION_PARITY_ENABLED' ||
  flag === 'FF_ORDER_PROJECTION_SOAK_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-26T23:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `soak-${++n}`;
  })(),
};

const matchReport = (index: number, durationMs = 25): OrderParityReportRecord => ({
  reportId: `report-${index}`,
  orderId: `order-${index}`,
  outcome: 'MATCH',
  differences: [],
  comparedAt: `2026-06-26T23:00:0${index % 10}.000Z`,
  durationMs,
});

const mismatchReport = (index: number): OrderParityReportRecord => ({
  reportId: `report-bad-${index}`,
  orderId: `order-bad-${index}`,
  outcome: 'FIELD_MISMATCH',
  differences: [{ field: 'status', legacyValue: 'PENDING', projectionValue: 'CANCELLED', category: 'FIELD_MISMATCH' }],
  comparedAt: `2026-06-26T23:01:0${index % 10}.000Z`,
  durationMs: 30,
});

describe('EventSDK projection parity soak (M6 PR-9)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_ORDER_PROJECTION_SOAK_ENABLED to off', () => {
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_PROJECTION_SOAK_ENABLED, false);
  });

  it('runSoak skips when flags off', async () => {
    const source = new InMemoryParitySoakReportSource();
    source.seedMany(Array.from({ length: 10 }, (_, i) => matchReport(i)));

    const soak = createProjectionParitySoakInfrastructure({
      reportSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.runSoak();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('requires all six flags including FF_ORDER_PROJECTION_SOAK_ENABLED', async () => {
    const fiveFlagsOnly: EventFeatureFlagReader = (flag) =>
      flag !== 'FF_ORDER_PROJECTION_SOAK_ENABLED' && SOAK_FLAGS(flag);

    const source = new InMemoryParitySoakReportSource();
    source.seedMany(Array.from({ length: 10 }, (_, i) => matchReport(i)));

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: fiveFlagsOnly,
      reportSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('generates metrics from parity reports', async () => {
    const source = new InMemoryParitySoakReportSource();
    source.seedMany([
      ...Array.from({ length: 8 }, (_, i) => matchReport(i)),
      mismatchReport(1),
      mismatchReport(2),
    ]);

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 5 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const metrics = await soak.metrics();
    assert.equal(metrics.ok, true);
    if (metrics.ok) {
      assert.equal(metrics.value.totalComparisons, 10);
      assert.equal(metrics.value.successfulComparisons, 8);
      assert.equal(metrics.value.fieldMismatches, 2);
      assert.equal(metrics.value.parityPercent, 80);
      assert.ok(metrics.value.mismatchDistribution.status >= 2);
    }
  });

  it('runSoak produces READY certification for high parity', async () => {
    const telemetry: ProjectionParitySoakTelemetryEvent[] = [];
    const source = new InMemoryParitySoakReportSource();
    source.seedMany(Array.from({ length: 20 }, (_, i) => matchReport(i, 20 + i)));

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await soak.runSoak();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.reportCount, 20);
      assert.equal(result.value.certification.readiness.certification, 'READY');
      assert.equal(result.value.certification.health.status, 'GREEN');
      assert.equal(result.value.certification.metrics.parityPercent, 100);
    }

    const saved = await soak.certificationRepository.getLatest();
    assert.equal(saved.ok, true);
    if (saved.ok) assert.ok(saved.value);

    assert.ok(telemetry.some((e) => e.type === 'projection_soak_started'));
    assert.ok(telemetry.some((e) => e.type === 'projection_readiness_generated'));
    assert.ok(telemetry.some((e) => e.type === 'projection_certification_generated'));
    assert.ok(telemetry.some((e) => e.type === 'projection_soak_completed'));
  });

  it('runSoak produces NOT_READY for insufficient sample', async () => {
    const source = new InMemoryParitySoakReportSource();
    source.seedMany(Array.from({ length: 3 }, (_, i) => matchReport(i)));

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.readiness.certification, 'NOT_READY');
      assert.ok(result.value.readiness.blockers.some((b) => b.includes('sample')));
    }
  });

  it('runSoak produces CONDITIONAL for amber parity band', async () => {
    const source = new InMemoryParitySoakReportSource();
    source.seedMany([
      ...Array.from({ length: 98 }, (_, i) => matchReport(i)),
      mismatchReport(1),
      mismatchReport(2),
    ]);

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10, readyMinParityPercent: 99.9 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.readiness.certification, 'CONDITIONAL');
      assert.equal(result.value.health.status, 'AMBER');
    }
  });

  it('runSoak produces NOT_READY for high mismatch rate', async () => {
    const source = new InMemoryParitySoakReportSource();
    source.seedMany([
      ...Array.from({ length: 5 }, (_, i) => matchReport(i)),
      ...Array.from({ length: 15 }, (_, i) => mismatchReport(i)),
    ]);

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.health.status, 'RED');
      assert.equal(result.value.readiness.certification, 'NOT_READY');
    }
  });

  it('calculates average and p95 latency from reports', async () => {
    const source = new InMemoryParitySoakReportSource();
    source.seedMany(Array.from({ length: 10 }, (_, i) => matchReport(i, (i + 1) * 10)));

    const soak = createProjectionParitySoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 5 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const metrics = await soak.metrics();
    assert.equal(metrics.ok, true);
    if (metrics.ok) {
      assert.equal(metrics.value.averageLatencyMs, 55);
      assert.equal(metrics.value.p95LatencyMs, 100);
    }
  });
});
