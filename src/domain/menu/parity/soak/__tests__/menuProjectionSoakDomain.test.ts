import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeMenuProjectionTrend } from '../MenuProjectionTrend';
import {
  buildMenuProjectionCertificationReport,
  buildMenuProjectionSoakMetrics,
} from '../MenuProjectionCertificationRules';
import { DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS } from '../MenuProjectionThresholds';

describe('Menu projection soak domain (M7 PR-9)', () => {
  it('buildMenuProjectionSoakMetrics computes parity and missing percentages', () => {
    const metrics = buildMenuProjectionSoakMetrics({
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

  it('buildMenuProjectionCertificationReport returns READY for high parity sample', () => {
    const report = buildMenuProjectionCertificationReport(
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
      '2026-06-27T14:00:00.000Z',
      { ...DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS, minSampleSize: 10 }
    );
    assert.equal(report.readiness.certification, 'READY');
    assert.equal(report.health.status, 'GREEN');
  });

  it('buildMenuProjectionCertificationReport returns NOT_READY for insufficient sample', () => {
    const report = buildMenuProjectionCertificationReport(
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
      '2026-06-27T14:00:00.000Z'
    );
    assert.equal(report.readiness.certification, 'NOT_READY');
    assert.ok(report.readiness.blockers.some((blocker) => blocker.includes('sample')));
  });

  it('analyzeMenuProjectionTrend detects improving parity', () => {
    const trend = analyzeMenuProjectionTrend([90, 91, 98, 99, 100, 100]);
    assert.equal(trend.direction, 'IMPROVING');
    assert.ok(trend.deltaPercent > 0);
  });
});
