import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildProjectionOperationalMetrics,
  buildProjectionOperationalReport,
  evaluateProjectionOperationalHealth,
  evaluateOperationalReadiness,
  computePercentile,
} from '../ProjectionOperationalRules';
import { computeLagMs, buildProjectionLagMetrics } from '../ProjectionLag';
import { detectProjectionDrift } from '../ProjectionDrift';
import { evaluateProjectionReplayHealth } from '../ProjectionReplayHealth';
import { DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS } from '../ProjectionOperationalThresholds';

const healthySample = (overrides: Record<string, unknown> = {}) => ({
  projectionName: 'order-read-shadow',
  processedEvents: 1000,
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
  evaluatedAt: '2026-06-27T00:00:05.000Z',
  windowDurationMs: 3_600_000,
  ...overrides,
});

describe('Projection operations domain (M6 PR-10)', () => {
  it('computeLagMs returns positive lag', () => {
    assert.equal(
      computeLagMs('2026-06-27T00:00:00.000Z', '2026-06-27T00:00:05.000Z'),
      5000
    );
  });

  it('buildProjectionLagMetrics tracks maximum lag', () => {
    const lag = buildProjectionLagMetrics(
      {
        projectionName: 'order-read-shadow',
        lastEventProcessedAt: '2026-06-27T00:00:00.000Z',
        evaluatedAt: '2026-06-27T00:00:10.000Z',
      },
      5000
    );
    assert.equal(lag.maximumLagMs, 10000);
  });

  it('detectProjectionDrift flags duplicates and missing events', () => {
    const drift = detectProjectionDrift(
      {
        projectionName: 'order-read-shadow',
        processedEvents: 100,
        duplicateEvents: 5,
        droppedEvents: 1,
        missingEvents: 2,
        outOfOrderEvents: 1,
      },
      0.5,
      0.1
    );
    assert.equal(drift.driftDetected, true);
    assert.ok(drift.reasons.length > 0);
  });

  it('evaluateProjectionReplayHealth verifies replay success', () => {
    const replay = evaluateProjectionReplayHealth(
      { projectionName: 'order-read-shadow', replayAttempts: 100, replaySuccesses: 100 },
      99
    );
    assert.equal(replay.replaySuccessPercent, 100);
    assert.equal(replay.verified, true);
  });

  it('buildProjectionOperationalMetrics aggregates latency percentiles', () => {
    const metrics = buildProjectionOperationalMetrics(healthySample());
    assert.equal(metrics.averageProjectionLatencyMs, 60);
    assert.equal(metrics.p95LatencyMs, 100);
    assert.equal(metrics.replaySuccessPercent, 100);
  });

  it('evaluateProjectionOperationalHealth returns GREEN for healthy metrics', () => {
    const metrics = buildProjectionOperationalMetrics(healthySample());
    const health = evaluateProjectionOperationalHealth(metrics, false);
    assert.equal(health.status, 'GREEN');
  });

  it('evaluateOperationalReadiness returns READY_FOR_SWITCH when healthy', () => {
    const metrics = buildProjectionOperationalMetrics(healthySample());
    const health = evaluateProjectionOperationalHealth(metrics, false);
    const readiness = evaluateOperationalReadiness(health, metrics, false, 20);
    assert.equal(readiness, 'READY_FOR_SWITCH');
  });

  it('evaluateOperationalReadiness returns REQUIRES_INVESTIGATION for drift', () => {
    const metrics = buildProjectionOperationalMetrics(healthySample());
    const health = evaluateProjectionOperationalHealth(metrics, true);
    const readiness = evaluateOperationalReadiness(health, metrics, true, 20);
    assert.equal(readiness, 'REQUIRES_INVESTIGATION');
  });

  it('buildProjectionOperationalReport returns NOT_READY for insufficient samples', () => {
    const report = buildProjectionOperationalReport('op-001', healthySample(), 3);
    assert.equal(report.readiness, 'NOT_READY');
    assert.ok(report.blockers.some((b) => b.includes('sample')));
  });

  it('computePercentile calculates p99', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    assert.equal(computePercentile(values, 99), 99);
  });

  it('default thresholds are conservative', () => {
    assert.equal(DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS.minReplaySuccessPercent, 99);
    assert.equal(DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS.maxLagMs, 30_000);
  });
});
