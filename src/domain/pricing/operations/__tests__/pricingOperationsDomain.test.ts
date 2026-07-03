import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPricingOperationalMetrics,
  buildPricingOperationalReport,
  evaluatePricingOperationalHealth,
  evaluatePricingOperationalReadiness,
  computePricingPercentile,
} from '../PricingOperationalRules';
import { computePricingLagMs, buildPricingProjectionLagMetrics } from '../PricingProjectionLag';
import { detectPricingProjectionDrift } from '../PricingProjectionDrift';
import { evaluatePricingReplayHealth } from '../PricingReplayHealth';
import { DEFAULT_PRICING_OPERATIONAL_THRESHOLDS } from '../PricingOperationalThresholds';

const healthySample = (overrides: Record<string, unknown> = {}) => ({
  projectionName: 'pricing-catalog-read-shadow',
  processedEvents: 1000,
  failedEvents: 0,
  duplicateEvents: 0,
  droppedEvents: 0,
  missingEvents: 0,
  outOfOrderEvents: 0,
  replayAttempts: 100,
  replaySuccesses: 100,
  processingLatenciesMs: [20, 30, 40, 50, 60, 70, 80, 90, 100],
  checkpointUpdatedAt: '2026-07-03T00:00:00.000Z',
  workerStartedAt: '2026-07-02T23:00:00.000Z',
  lastEventProcessedAt: '2026-07-03T00:00:00.000Z',
  evaluatedAt: '2026-07-03T00:00:05.000Z',
  windowDurationMs: 3_600_000,
  ...overrides,
});

describe('Pricing operations domain (M8 PR-10)', () => {
  it('computePricingLagMs returns positive lag', () => {
    assert.equal(
      computePricingLagMs('2026-07-03T00:00:00.000Z', '2026-07-03T00:00:05.000Z'),
      5000
    );
  });

  it('buildPricingProjectionLagMetrics tracks maximum lag', () => {
    const lag = buildPricingProjectionLagMetrics(
      {
        projectionName: 'pricing-catalog-read-shadow',
        lastEventProcessedAt: '2026-07-03T00:00:00.000Z',
        evaluatedAt: '2026-07-03T00:00:10.000Z',
      },
      5000
    );
    assert.equal(lag.maximumLagMs, 10000);
  });

  it('detectPricingProjectionDrift flags duplicates and missing events', () => {
    const drift = detectPricingProjectionDrift(
      {
        projectionName: 'pricing-catalog-read-shadow',
        processedEvents: 100,
        duplicateEvents: 5,
        droppedEvents: 1,
        missingEvents: 2,
        outOfOrderEvents: 1,
      },
      0.5,
      0.1,
      0
    );
    assert.equal(drift.driftDetected, true);
    assert.ok(drift.reasons.length > 0);
  });

  it('evaluatePricingReplayHealth verifies replay success', () => {
    const replay = evaluatePricingReplayHealth(
      {
        projectionName: 'pricing-catalog-read-shadow',
        replayAttempts: 100,
        replaySuccesses: 100,
      },
      99
    );
    assert.equal(replay.replaySuccessPercent, 100);
    assert.equal(replay.verified, true);
  });

  it('buildPricingOperationalMetrics aggregates latency percentiles', () => {
    const metrics = buildPricingOperationalMetrics(healthySample());
    assert.equal(metrics.averageLatencyMs, 60);
    assert.equal(metrics.p95LatencyMs, 100);
    assert.equal(metrics.replaySuccessPercent, 100);
    assert.ok(metrics.throughputPerMinute > 0);
  });

  it('evaluatePricingOperationalHealth returns GREEN for healthy metrics', () => {
    const metrics = buildPricingOperationalMetrics(healthySample());
    const health = evaluatePricingOperationalHealth(metrics, false);
    assert.equal(health.status, 'GREEN');
  });

  it('evaluatePricingOperationalReadiness returns READY_FOR_SWITCH when healthy', () => {
    const metrics = buildPricingOperationalMetrics(healthySample());
    const health = evaluatePricingOperationalHealth(metrics, false);
    const readiness = evaluatePricingOperationalReadiness(health, metrics, false, 20);
    assert.equal(readiness, 'READY_FOR_SWITCH');
  });

  it('evaluatePricingOperationalReadiness returns REQUIRES_INVESTIGATION for drift', () => {
    const metrics = buildPricingOperationalMetrics(healthySample({ missingEvents: 1 }));
    const health = evaluatePricingOperationalHealth(metrics, true);
    const readiness = evaluatePricingOperationalReadiness(health, metrics, true, 20);
    assert.equal(readiness, 'REQUIRES_INVESTIGATION');
  });

  it('evaluatePricingOperationalReadiness returns NOT_READY for insufficient sample', () => {
    const metrics = buildPricingOperationalMetrics(healthySample());
    const health = evaluatePricingOperationalHealth(metrics, false);
    const readiness = evaluatePricingOperationalReadiness(health, metrics, false, 5);
    assert.equal(readiness, 'NOT_READY');
  });

  it('buildPricingOperationalReport produces deterministic readiness', () => {
    const report = buildPricingOperationalReport('report-1', healthySample(), 20);
    assert.equal(report.readiness, 'READY_FOR_SWITCH');
    assert.equal(report.health.status, 'GREEN');
    assert.equal(report.blockers.length, 0);
  });

  it('computePricingPercentile handles empty input', () => {
    assert.equal(computePricingPercentile([], 95), 0);
  });

  it('uses default thresholds with maxCriticalDriftCount zero', () => {
    assert.equal(DEFAULT_PRICING_OPERATIONAL_THRESHOLDS.maxCriticalDriftCount, 0);
    assert.equal(DEFAULT_PRICING_OPERATIONAL_THRESHOLDS.maxLagMs, 30_000);
    assert.equal(DEFAULT_PRICING_OPERATIONAL_THRESHOLDS.minWorkerUptimePercent, 99);
  });
});
