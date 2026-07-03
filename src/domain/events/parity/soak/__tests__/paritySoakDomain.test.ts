import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildParitySoakMetrics,
  buildCertificationReport,
  evaluateProjectionHealth,
  evaluateParityCertification,
  computePercentileLatencies,
} from '../ParityCertificationRules';
import { DEFAULT_PARITY_SOAK_THRESHOLDS, mergeParitySoakThresholds } from '../ParityThresholds';
import { analyzeParityTrend } from '../ParityTrend';
import { buildReadinessRecommendation } from '../ParityReadiness';

const baseInput = (overrides: Record<string, unknown> = {}) => ({
  totalComparisons: 100,
  successfulComparisons: 100,
  fieldMismatches: 0,
  missingProjections: 0,
  missingLegacy: 0,
  versionMismatches: 0,
  unsupportedEvents: 0,
  averageLatencyMs: 20,
  p95LatencyMs: 40,
  mismatchDistribution: {},
  windowParityPercents: [100, 100, 100, 100, 100],
  ...overrides,
});

describe('Parity soak domain (M6 PR-9)', () => {
  it('exports default thresholds', () => {
    assert.equal(DEFAULT_PARITY_SOAK_THRESHOLDS.minSampleSize, 10);
    assert.equal(DEFAULT_PARITY_SOAK_THRESHOLDS.greenMinParityPercent, 99);
  });

  it('buildParitySoakMetrics calculates percentages', () => {
    const metrics = buildParitySoakMetrics(
      baseInput({
        successfulComparisons: 95,
        fieldMismatches: 3,
        missingProjections: 2,
      })
    );
    assert.equal(metrics.parityPercent, 95);
    assert.equal(metrics.fieldParityPercent, 97);
    assert.equal(metrics.missingProjectionPercent, 2);
  });

  it('evaluateProjectionHealth returns GREEN for strong parity', () => {
    const metrics = buildParitySoakMetrics(baseInput());
    const health = evaluateProjectionHealth(metrics);
    assert.equal(health.status, 'GREEN');
    assert.ok(health.score >= 90);
  });

  it('evaluateProjectionHealth returns RED for low parity', () => {
    const metrics = buildParitySoakMetrics(
      baseInput({ successfulComparisons: 80, fieldMismatches: 20 })
    );
    const health = evaluateProjectionHealth(metrics);
    assert.equal(health.status, 'RED');
  });

  it('evaluateParityCertification returns READY for GREEN metrics', () => {
    const metrics = buildParitySoakMetrics(baseInput());
    const health = evaluateProjectionHealth(metrics);
    const certification = evaluateParityCertification(metrics, health);
    assert.equal(certification, 'READY');
  });

  it('evaluateParityCertification returns NOT_READY for insufficient sample', () => {
    const metrics = buildParitySoakMetrics(baseInput({ totalComparisons: 3, successfulComparisons: 3 }));
    const health = evaluateProjectionHealth(metrics);
    const certification = evaluateParityCertification(metrics, health);
    assert.equal(certification, 'NOT_READY');
  });

  it('evaluateParityCertification returns CONDITIONAL for amber band', () => {
    const thresholds = mergeParitySoakThresholds({ minSampleSize: 5 });
    const metrics = buildParitySoakMetrics(
      baseInput({ totalComparisons: 100, successfulComparisons: 98, fieldMismatches: 2 })
    );
    const health = evaluateProjectionHealth(metrics, thresholds);
    const certification = evaluateParityCertification(metrics, health, thresholds);
    assert.equal(health.status, 'AMBER');
    assert.equal(certification, 'CONDITIONAL');
  });

  it('buildCertificationReport includes trend and readiness', () => {
    const report = buildCertificationReport('cert-001', baseInput(), '2026-06-26T23:00:00.000Z');
    assert.equal(report.certificationId, 'cert-001');
    assert.equal(report.readiness.certification, 'READY');
    assert.equal(report.trend.direction, 'STABLE');
  });

  it('analyzeParityTrend detects improving trend', () => {
    const trend = analyzeParityTrend([90, 91, 98, 99, 100, 100]);
    assert.equal(trend.direction, 'IMPROVING');
    assert.ok(trend.deltaPercent > 0);
  });

  it('computePercentileLatencies calculates p95', () => {
    const p95 = computePercentileLatencies([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95);
    assert.equal(p95, 100);
  });

  it('buildReadinessRecommendation varies by certification', () => {
    assert.match(buildReadinessRecommendation('READY', 'GREEN'), /ARB approval/);
    assert.match(buildReadinessRecommendation('NOT_READY', 'RED'), /not ready/i);
  });
});
