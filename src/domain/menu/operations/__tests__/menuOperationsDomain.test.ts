import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMenuOperationalMetrics,
  buildMenuOperationalReport,
  evaluateMenuOperationalHealth,
  evaluateMenuOperationalReadiness,
  computeMenuPercentile,
} from '../MenuOperationalRules';
import { computeMenuLagMs, buildMenuProjectionLagMetrics } from '../MenuProjectionLag';
import { detectMenuProjectionDrift } from '../MenuProjectionDrift';
import { evaluateMenuReplayHealth } from '../MenuReplayHealth';
import { DEFAULT_MENU_OPERATIONAL_THRESHOLDS } from '../MenuOperationalThresholds';

const healthySample = (overrides: Record<string, unknown> = {}) => ({
  projectionName: 'menu-catalog-read-shadow',
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

describe('Menu operations domain (M7 PR-10)', () => {
  it('computeMenuLagMs returns positive lag', () => {
    assert.equal(
      computeMenuLagMs('2026-06-27T00:00:00.000Z', '2026-06-27T00:00:05.000Z'),
      5000
    );
  });

  it('buildMenuProjectionLagMetrics tracks maximum lag', () => {
    const lag = buildMenuProjectionLagMetrics(
      {
        projectionName: 'menu-catalog-read-shadow',
        lastEventProcessedAt: '2026-06-27T00:00:00.000Z',
        evaluatedAt: '2026-06-27T00:00:10.000Z',
      },
      5000
    );
    assert.equal(lag.maximumLagMs, 10000);
  });

  it('detectMenuProjectionDrift flags duplicates and missing events', () => {
    const drift = detectMenuProjectionDrift(
      {
        projectionName: 'menu-catalog-read-shadow',
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

  it('evaluateMenuReplayHealth verifies replay success', () => {
    const replay = evaluateMenuReplayHealth(
      { projectionName: 'menu-catalog-read-shadow', replayAttempts: 100, replaySuccesses: 100 },
      99
    );
    assert.equal(replay.replaySuccessPercent, 100);
    assert.equal(replay.verified, true);
  });

  it('buildMenuOperationalMetrics aggregates latency percentiles', () => {
    const metrics = buildMenuOperationalMetrics(healthySample());
    assert.equal(metrics.averageProjectionLatencyMs, 60);
    assert.equal(metrics.p95LatencyMs, 100);
    assert.equal(metrics.replaySuccessPercent, 100);
  });

  it('evaluateMenuOperationalHealth returns GREEN for healthy metrics', () => {
    const metrics = buildMenuOperationalMetrics(healthySample());
    const health = evaluateMenuOperationalHealth(metrics, false);
    assert.equal(health.status, 'GREEN');
  });

  it('evaluateMenuOperationalReadiness returns READY_FOR_SWITCH when healthy', () => {
    const metrics = buildMenuOperationalMetrics(healthySample());
    const health = evaluateMenuOperationalHealth(metrics, false);
    const readiness = evaluateMenuOperationalReadiness(health, metrics, false, 20);
    assert.equal(readiness, 'READY_FOR_SWITCH');
  });

  it('evaluateMenuOperationalReadiness returns REQUIRES_INVESTIGATION for drift', () => {
    const metrics = buildMenuOperationalMetrics(healthySample({ missingEvents: 1 }));
    const health = evaluateMenuOperationalHealth(metrics, true);
    const readiness = evaluateMenuOperationalReadiness(health, metrics, true, 20);
    assert.equal(readiness, 'REQUIRES_INVESTIGATION');
  });

  it('evaluateMenuOperationalReadiness returns NOT_READY for insufficient sample', () => {
    const metrics = buildMenuOperationalMetrics(healthySample());
    const health = evaluateMenuOperationalHealth(metrics, false);
    const readiness = evaluateMenuOperationalReadiness(health, metrics, false, 5);
    assert.equal(readiness, 'NOT_READY');
  });

  it('buildMenuOperationalReport produces deterministic readiness', () => {
    const report = buildMenuOperationalReport('report-1', healthySample(), 20);
    assert.equal(report.readiness, 'READY_FOR_SWITCH');
    assert.equal(report.health.status, 'GREEN');
    assert.equal(report.blockers.length, 0);
  });

  it('computeMenuPercentile handles empty input', () => {
    assert.equal(computeMenuPercentile([], 95), 0);
  });

  it('uses default thresholds with maxCriticalDriftCount zero', () => {
    assert.equal(DEFAULT_MENU_OPERATIONAL_THRESHOLDS.maxCriticalDriftCount, 0);
    assert.equal(DEFAULT_MENU_OPERATIONAL_THRESHOLDS.maxLagMs, 30_000);
    assert.equal(DEFAULT_MENU_OPERATIONAL_THRESHOLDS.minWorkerUptimePercent, 99);
  });
});
