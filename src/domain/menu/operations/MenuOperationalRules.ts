/** Menu operational rules (M7 PR-10). Pure domain — no SDK imports. */

import type { MenuOperationalThresholds } from './MenuOperationalThresholds';
import {
  DEFAULT_MENU_OPERATIONAL_THRESHOLDS,
  mergeMenuOperationalThresholds,
} from './MenuOperationalThresholds';
import { buildMenuProjectionLagMetrics, type MenuProjectionLagSample } from './MenuProjectionLag';
import { detectMenuProjectionDrift, type MenuProjectionDriftSample } from './MenuProjectionDrift';
import { evaluateMenuReplayHealth, type MenuReplaySample } from './MenuReplayHealth';
import {
  computeMenuOperationalHealthScore,
  type MenuProjectionHealth,
  type MenuProjectionHealthStatus,
} from './MenuProjectionHealth';

export type MenuOperationalReadiness =
  | 'READY_FOR_SWITCH'
  | 'NOT_READY'
  | 'REQUIRES_INVESTIGATION';

export interface MenuOperationalSample {
  readonly projectionName: string;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly duplicateEvents: number;
  readonly droppedEvents: number;
  readonly missingEvents: number;
  readonly outOfOrderEvents: number;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
  readonly processingLatenciesMs: readonly number[];
  readonly checkpointUpdatedAt?: string;
  readonly workerStartedAt: string;
  readonly lastEventProcessedAt: string;
  readonly evaluatedAt: string;
  readonly windowDurationMs: number;
}

export interface MenuOperationalMetrics {
  readonly projectionName: string;
  readonly averageProjectionLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly maximumLagMs: number;
  readonly replaySuccessPercent: number;
  readonly duplicatePercent: number;
  readonly droppedEventPercent: number;
  readonly checkpointAgeMs: number;
  readonly workerUptimePercent: number;
  readonly projectionThroughputPerMinute: number;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly duplicateEventCount: number;
  readonly missingEventCount: number;
  readonly outOfOrderEventCount: number;
  readonly projectionDriftCount: number;
}

export interface MenuOperationalReport {
  readonly reportId: string;
  readonly projectionName: string;
  readonly metrics: MenuOperationalMetrics;
  readonly health: MenuProjectionHealth;
  readonly readiness: MenuOperationalReadiness;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly generatedAt: string;
}

export function computeMenuPercentile(values: readonly number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function buildMenuOperationalMetrics(sample: MenuOperationalSample): MenuOperationalMetrics {
  const latencies = sample.processingLatenciesMs.filter((value) => Number.isFinite(value));
  const averageProjectionLatencyMs =
    latencies.length === 0
      ? 0
      : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);

  const lagSample: MenuProjectionLagSample = {
    projectionName: sample.projectionName,
    lastEventProcessedAt: sample.lastEventProcessedAt,
    evaluatedAt: sample.evaluatedAt,
    checkpointUpdatedAt: sample.checkpointUpdatedAt,
  };
  const lag = buildMenuProjectionLagMetrics(lagSample);

  const driftSample: MenuProjectionDriftSample = {
    projectionName: sample.projectionName,
    processedEvents: sample.processedEvents,
    duplicateEvents: sample.duplicateEvents,
    droppedEvents: sample.droppedEvents,
    missingEvents: sample.missingEvents,
    outOfOrderEvents: sample.outOfOrderEvents,
  };
  const drift = detectMenuProjectionDrift(driftSample, 100, 100, 0);

  const replay = evaluateMenuReplayHealth(
    {
      projectionName: sample.projectionName,
      replayAttempts: sample.replayAttempts,
      replaySuccesses: sample.replaySuccesses,
    },
    0
  );

  const workerUptimeMs = Math.max(
    0,
    Date.parse(sample.evaluatedAt) - Date.parse(sample.workerStartedAt)
  );
  const downtimeMs = sample.failedEvents * 1000;
  const effectiveUptimeMs = Math.max(
    0,
    Math.min(workerUptimeMs, sample.windowDurationMs) - downtimeMs
  );
  const workerUptimePercent = percent(effectiveUptimeMs, Math.max(sample.windowDurationMs, 1));

  const windowMinutes = Math.max(sample.windowDurationMs / 60_000, 1 / 60);
  const projectionThroughputPerMinute =
    Math.round((sample.processedEvents / windowMinutes) * 100) / 100;

  return {
    projectionName: sample.projectionName,
    averageProjectionLatencyMs,
    p95LatencyMs: computeMenuPercentile(latencies, 95),
    p99LatencyMs: computeMenuPercentile(latencies, 99),
    maximumLagMs: lag.maximumLagMs,
    replaySuccessPercent: replay.replaySuccessPercent,
    duplicatePercent: drift.duplicatePercent,
    droppedEventPercent: drift.droppedEventPercent,
    checkpointAgeMs: lag.checkpointAgeMs,
    workerUptimePercent,
    projectionThroughputPerMinute,
    processedEvents: sample.processedEvents,
    failedEvents: sample.failedEvents,
    duplicateEventCount: sample.duplicateEvents,
    missingEventCount: sample.missingEvents,
    outOfOrderEventCount: sample.outOfOrderEvents,
    projectionDriftCount: drift.projectionDriftCount,
  };
}

export function evaluateMenuOperationalHealth(
  metrics: MenuOperationalMetrics,
  driftDetected: boolean,
  thresholds: MenuOperationalThresholds = DEFAULT_MENU_OPERATIONAL_THRESHOLDS
): MenuProjectionHealth {
  const reasons: string[] = [];
  const penalties: number[] = [];

  if (metrics.averageProjectionLatencyMs > thresholds.maxAverageLatencyMs) {
    reasons.push(
      `Average latency ${metrics.averageProjectionLatencyMs}ms exceeds ${thresholds.maxAverageLatencyMs}ms`
    );
    penalties.push(10);
  }
  if (metrics.p95LatencyMs > thresholds.maxP95LatencyMs) {
    reasons.push(`P95 latency ${metrics.p95LatencyMs}ms exceeds ${thresholds.maxP95LatencyMs}ms`);
    penalties.push(8);
  }
  if (metrics.p99LatencyMs > thresholds.maxP99LatencyMs) {
    reasons.push(`P99 latency ${metrics.p99LatencyMs}ms exceeds ${thresholds.maxP99LatencyMs}ms`);
    penalties.push(5);
  }
  if (metrics.maximumLagMs > thresholds.maxLagMs) {
    reasons.push(`Maximum lag ${metrics.maximumLagMs}ms exceeds ${thresholds.maxLagMs}ms`);
    penalties.push(12);
  }
  if (metrics.replaySuccessPercent < thresholds.minReplaySuccessPercent) {
    reasons.push(
      `Replay success ${metrics.replaySuccessPercent}% below ${thresholds.minReplaySuccessPercent}%`
    );
    penalties.push(10);
  }
  if (metrics.duplicatePercent > thresholds.maxDuplicatePercent) {
    reasons.push(
      `Duplicate rate ${metrics.duplicatePercent}% exceeds ${thresholds.maxDuplicatePercent}%`
    );
    penalties.push(8);
  }
  if (metrics.droppedEventPercent > thresholds.maxDroppedEventPercent) {
    reasons.push(
      `Dropped event rate ${metrics.droppedEventPercent}% exceeds ${thresholds.maxDroppedEventPercent}%`
    );
    penalties.push(10);
  }
  if (metrics.checkpointAgeMs > thresholds.maxCheckpointAgeMs) {
    reasons.push(
      `Checkpoint age ${metrics.checkpointAgeMs}ms exceeds ${thresholds.maxCheckpointAgeMs}ms`
    );
    penalties.push(6);
  }
  if (metrics.workerUptimePercent < thresholds.minWorkerUptimePercent) {
    reasons.push(
      `Worker uptime ${metrics.workerUptimePercent}% below ${thresholds.minWorkerUptimePercent}%`
    );
    penalties.push(8);
  }
  if (metrics.projectionThroughputPerMinute < thresholds.minThroughputPerMinute) {
    reasons.push(
      `Throughput ${metrics.projectionThroughputPerMinute}/min below ${thresholds.minThroughputPerMinute}/min`
    );
    penalties.push(5);
  }
  if (metrics.projectionDriftCount > thresholds.maxCriticalDriftCount) {
    reasons.push(
      `Projection drift count ${metrics.projectionDriftCount} exceeds critical threshold ${thresholds.maxCriticalDriftCount}`
    );
    penalties.push(10);
  }
  if (driftDetected) {
    reasons.push('Projection drift detected');
    penalties.push(10);
  }

  const score = computeMenuOperationalHealthScore(100, penalties);
  let status: MenuProjectionHealthStatus = 'GREEN';
  if (penalties.length > 0 && score >= 70) status = 'AMBER';
  if (score < 70 || penalties.length >= 4) status = 'RED';

  if (reasons.length === 0) {
    reasons.push('Operational metrics within thresholds');
  }

  return { status, score, reasons };
}

export function evaluateMenuOperationalReadiness(
  health: MenuProjectionHealth,
  metrics: MenuOperationalMetrics,
  driftDetected: boolean,
  sampleCount: number,
  thresholds: MenuOperationalThresholds = DEFAULT_MENU_OPERATIONAL_THRESHOLDS
): MenuOperationalReadiness {
  if (sampleCount < thresholds.minSampleSize) return 'NOT_READY';
  if (health.status === 'RED') return 'NOT_READY';
  if (driftDetected || health.status === 'AMBER') return 'REQUIRES_INVESTIGATION';
  if (
    health.status === 'GREEN' &&
    metrics.maximumLagMs <= thresholds.maxLagMs &&
    metrics.replaySuccessPercent >= thresholds.minReplaySuccessPercent &&
    metrics.duplicatePercent <= thresholds.maxDuplicatePercent &&
    metrics.droppedEventPercent <= thresholds.maxDroppedEventPercent &&
    metrics.projectionDriftCount <= thresholds.maxCriticalDriftCount
  ) {
    return 'READY_FOR_SWITCH';
  }
  return 'NOT_READY';
}

export function buildMenuOperationalRecommendation(
  readiness: MenuOperationalReadiness
): string {
  switch (readiness) {
    case 'READY_FOR_SWITCH':
      return 'Menu operational validation passed. Await ARB approval and explicit adapter switch authorization before read adapter layer.';
    case 'REQUIRES_INVESTIGATION':
      return 'Operational anomalies detected. Investigate lag, drift, or replay issues before proceeding.';
    default:
      return 'Menu operational validation not ready. Continue soak certification and remediate blockers.';
  }
}

export function buildMenuOperationalReport(
  reportId: string,
  sample: MenuOperationalSample,
  sampleCount: number,
  thresholds: Partial<MenuOperationalThresholds> = {}
): MenuOperationalReport {
  const resolvedThresholds = mergeMenuOperationalThresholds(thresholds);
  const metrics = buildMenuOperationalMetrics(sample);
  const drift = detectMenuProjectionDrift(
    sample,
    resolvedThresholds.maxDuplicatePercent,
    resolvedThresholds.maxDroppedEventPercent,
    resolvedThresholds.maxCriticalDriftCount
  );
  const health = evaluateMenuOperationalHealth(metrics, drift.driftDetected, resolvedThresholds);
  const readiness = evaluateMenuOperationalReadiness(
    health,
    metrics,
    drift.driftDetected,
    sampleCount,
    resolvedThresholds
  );

  const blockers: string[] = [];
  if (sampleCount < resolvedThresholds.minSampleSize) {
    blockers.push('Insufficient operational sample size');
  }
  if (drift.driftDetected) blockers.push('Projection drift detected');
  if (health.status === 'RED') blockers.push('Operational health is RED');

  return {
    reportId,
    projectionName: sample.projectionName,
    metrics,
    health,
    readiness,
    recommendation: buildMenuOperationalRecommendation(readiness),
    blockers,
    generatedAt: sample.evaluatedAt,
  };
}
