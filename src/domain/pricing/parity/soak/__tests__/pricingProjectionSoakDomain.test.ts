import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzePricingProjectionTrend } from '../PricingProjectionTrend';
import {
  buildPricingProjectionCertificationReport,
  buildPricingProjectionSoakMetrics,
} from '../PricingProjectionCertificationRules';
import { DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS } from '../PricingProjectionThresholds';

describe('Pricing projection soak domain (M8 PR-9)', () => {
  it('buildPricingProjectionSoakMetrics computes parity and missing percentages', () => {
    const metrics = buildPricingProjectionSoakMetrics({
      totalComparisons: 100,
      successfulComparisons: 99,
      fieldMismatches: 1,
      missingInProjection: 1,
      missingInLegacy: 0,
      versionMismatches: 0,
      unsupported: 0,
      averageLatencyMs: 30,
      p95LatencyMs: 45,
      mismatchDistribution: { status: 1 },
      windowParityPercents: [98, 99, 100],
      criticalMismatchCount: 1,
    });
    assert.equal(metrics.parityPercent, 99);
    assert.equal(metrics.fieldParityPercent, 99);
    assert.equal(metrics.missingPercent, 1);
  });

  it('buildPricingProjectionCertificationReport returns READY for high parity sample', () => {
    const report = buildPricingProjectionCertificationReport(
      'cert-1',
      {
        totalComparisons: 20,
        successfulComparisons: 20,
        fieldMismatches: 0,
        missingInProjection: 0,
        missingInLegacy: 0,
        versionMismatches: 0,
        unsupported: 0,
        averageLatencyMs: 25,
        p95LatencyMs: 40,
        mismatchDistribution: {},
        windowParityPercents: [100, 100, 100, 100],
        criticalMismatchCount: 0,
      },
      '2026-07-03T14:00:00.000Z',
      { ...DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS, minSampleSize: 10 }
    );
    assert.equal(report.readiness.certification, 'READY');
    assert.equal(report.health.status, 'GREEN');
  });

  it('buildPricingProjectionCertificationReport returns NOT_READY for insufficient sample', () => {
    const report = buildPricingProjectionCertificationReport(
      'cert-2',
      {
        totalComparisons: 3,
        successfulComparisons: 3,
        fieldMismatches: 0,
        missingInProjection: 0,
        missingInLegacy: 0,
        versionMismatches: 0,
        unsupported: 0,
        averageLatencyMs: 20,
        p95LatencyMs: 30,
        mismatchDistribution: {},
        windowParityPercents: [100],
        criticalMismatchCount: 0,
      },
      '2026-07-03T14:00:00.000Z'
    );
    assert.equal(report.readiness.certification, 'NOT_READY');
    assert.ok(report.readiness.blockers.some((blocker) => blocker.includes('sample')));
  });

  it('analyzePricingProjectionTrend detects improving parity', () => {
    const trend = analyzePricingProjectionTrend([90, 91, 98, 99, 100, 100]);
    assert.equal(trend.direction, 'IMPROVING');
    assert.ok(trend.deltaPercent > 0);
  });

  it('analyzePricingProjectionTrend detects stable parity within threshold', () => {
    const trend = analyzePricingProjectionTrend([99, 99.2, 99.1, 99.3]);
    assert.equal(trend.direction, 'STABLE');
  });
});
