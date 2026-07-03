import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_SDK_FEATURE_FLAG_DEFAULTS,
  type PricingFeatureFlagReader,
} from '../pricing/featureFlags/featureFlags';
import {
  createPricingProjectionSoakInfrastructure,
  InMemoryPricingParityReportSource,
} from '../pricing/parity/soak/PricingProjectionFactory';
import type { PricingParityReportRecord } from '../../domain/pricing/parity/PricingParityResult';
import type { PricingProjectionSoakTelemetryEvent } from '../pricing/parity/soak/PricingProjectionTelemetry';

const SOAK_FLAGS: PricingFeatureFlagReader = (flag) =>
  flag === 'FF_PRICING_PROJECTION_ENABLED' ||
  flag === 'FF_PRICING_PROJECTION_PARITY_ENABLED' ||
  flag === 'FF_PRICING_PROJECTION_SOAK_ENABLED';

const FIXED_CLOCK = { now: () => '2026-07-03T14:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `pricing-soak-${++n}`;
  })(),
};

const matchReport = (index: number, durationMs = 25): PricingParityReportRecord => ({
  reportId: `report-${index}`,
  priceListId: `pricelist-${index}`,
  outcome: 'MATCH',
  differences: [],
  comparedAt: `2026-07-03T14:00:0${index % 10}.000Z`,
  durationMs,
});

const mismatchReport = (index: number): PricingParityReportRecord => ({
  reportId: `report-bad-${index}`,
  priceListId: `pricelist-bad-${index}`,
  outcome: 'FIELD_MISMATCH',
  differences: [
    {
      field: 'priceCount',
      legacyValue: 42,
      projectionValue: 38,
      category: 'FIELD_MISMATCH',
    },
  ],
  comparedAt: `2026-07-03T14:01:0${index % 10}.000Z`,
  durationMs: 30,
});

const versionMismatchReport = (index: number): PricingParityReportRecord => ({
  reportId: `report-version-${index}`,
  priceListId: `pricelist-version-${index}`,
  outcome: 'VERSION_MISMATCH',
  differences: [
    {
      field: 'pricingVersion',
      legacyValue: '1.0.0',
      projectionValue: '1.1.0',
      category: 'VERSION_MISMATCH',
    },
  ],
  comparedAt: `2026-07-03T14:02:0${index % 10}.000Z`,
  durationMs: 35,
});

describe('Pricing catalog projection soak (M8 PR-9)', () => {
  it('defaults FF_PRICING_PROJECTION_SOAK_ENABLED to off', () => {
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_SOAK_ENABLED,
      false
    );
  });

  it('runSoak skips when flags are off', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany(Array.from({ length: 10 }, (_, index) => matchReport(index)));

    const soak = createPricingProjectionSoakInfrastructure({
      reportSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.runSoak();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('requires all three pricing projection flags including soak flag', async () => {
    const twoFlagsOnly: PricingFeatureFlagReader = (flag) =>
      flag !== 'FF_PRICING_PROJECTION_SOAK_ENABLED' && SOAK_FLAGS(flag);

    const source = new InMemoryPricingParityReportSource();
    source.seedMany(Array.from({ length: 10 }, (_, index) => matchReport(index)));

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: twoFlagsOnly,
      reportSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('generates metrics from parity reports', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany([
      ...Array.from({ length: 8 }, (_, index) => matchReport(index)),
      mismatchReport(1),
      mismatchReport(2),
    ]);

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 5 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const metrics = await soak.metrics();
    assert.equal(metrics.ok, true);
    if (!metrics.ok) return;
    assert.equal(metrics.value.totalComparisons, 10);
    assert.equal(metrics.value.successfulComparisons, 8);
    assert.equal(metrics.value.parityPercent, 80);
    assert.ok(metrics.value.mismatchDistribution.priceCount >= 2);
  });

  it('runSoak produces READY certification for high parity', async () => {
    const telemetry: PricingProjectionSoakTelemetryEvent[] = [];
    const source = new InMemoryPricingParityReportSource();
    source.seedMany(Array.from({ length: 20 }, (_, index) => matchReport(index, 20 + index)));

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await soak.runSoak();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.reportCount, 20);
    assert.equal(result.value.certification.readiness.certification, 'READY');
    assert.equal(result.value.certification.health.status, 'GREEN');
    assert.equal(result.value.certification.metrics.parityPercent, 100);

    const saved = await soak.certificationRepository.getLatest();
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.ok(saved.value);

    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_soak_started'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_readiness_generated'));
    assert.ok(
      telemetry.some((event) => event.type === 'pricing_projection_certification_generated')
    );
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_soak_completed'));
  });

  it('runSoak produces NOT_READY for insufficient sample', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany(Array.from({ length: 3 }, (_, index) => matchReport(index)));

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.readiness.certification, 'NOT_READY');
    assert.ok(result.value.readiness.blockers.some((blocker) => blocker.includes('sample')));
  });

  it('runSoak produces CONDITIONAL for amber parity band', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany([
      ...Array.from({ length: 98 }, (_, index) => matchReport(index)),
      mismatchReport(1),
      mismatchReport(2),
    ]);

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10, readyMinParityPercent: 99.9 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.readiness.certification, 'CONDITIONAL');
    assert.equal(result.value.health.status, 'AMBER');
  });

  it('runSoak produces NOT_READY for critical version mismatch', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany([
      ...Array.from({ length: 19 }, (_, index) => matchReport(index)),
      versionMismatchReport(1),
    ]);

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.readiness.certification, 'NOT_READY');
    assert.ok(
      result.value.readiness.blockers.some((blocker) => blocker.includes('Critical mismatch'))
    );
  });

  it('runSoak produces RED health for high mismatch rate', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany([
      ...Array.from({ length: 5 }, (_, index) => matchReport(index)),
      ...Array.from({ length: 15 }, (_, index) => mismatchReport(index)),
    ]);

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.health.status, 'RED');
    assert.equal(result.value.readiness.certification, 'NOT_READY');
  });

  it('calculates average and p95 latency from reports', async () => {
    const source = new InMemoryPricingParityReportSource();
    source.seedMany(Array.from({ length: 10 }, (_, index) => matchReport(index, (index + 1) * 10)));

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 5 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const metrics = await soak.metrics();
    assert.equal(metrics.ok, true);
    if (!metrics.ok) return;
    assert.equal(metrics.value.averageLatencyMs, 55);
    assert.equal(metrics.value.p95LatencyMs, 100);
  });

  it('detects improving trend from window parity percents', async () => {
    const reports: PricingParityReportRecord[] = [];
    for (let index = 0; index < 20; index++) {
      reports.push(index < 10 ? mismatchReport(index) : matchReport(index));
    }
    const source = new InMemoryPricingParityReportSource();
    source.seedMany(reports);

    const soak = createPricingProjectionSoakInfrastructure({
      featureFlags: SOAK_FLAGS,
      reportSource: source,
      thresholds: { minSampleSize: 10 },
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await soak.analyze();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.trend.direction, 'IMPROVING');
  });
});
