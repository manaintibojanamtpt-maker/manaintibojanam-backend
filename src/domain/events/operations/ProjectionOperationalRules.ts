/** Projection operational rules (M6 PR-10). Pure domain — no SDK imports. */

import type { ProjectionOperationalThresholds } from './ProjectionOperationalThresholds';
import { DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS, mergeProjectionOperationalThresholds } from './ProjectionOperationalThresholds';
import { buildProjectionLagMetrics, type ProjectionLagSample } from './ProjectionLag';
import { detectProjectionDrift, type ProjectionDriftSample } from './ProjectionDrift';
import { evaluateProjectionReplayHealth, type ProjectionReplaySample } from './ProjectionReplayHealth';
import {
  computeOperationalHealthScore,
  type ProjectionOperationalHealth,
  type ProjectionOperationalHealthStatus,
} from './ProjectionHealth';

export type ProjectionOperationalReadiness =
  | 'READY_FOR_SWITCH'
  | 'NOT_READY'
  | 'REQUIRES_INVESTIGATION';

export interface ProjectionOperationalSample {
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

export interface ProjectionOperationalMetrics {
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
}

export interface ProjectionOperationalReport {
  readonly reportId: string;
  readonly projectionName: string;
  readonly metrics: ProjectionOperationalMetrics;
  readonly health: ProjectionOperationalHealth;
  readonly readiness: ProjectionOperationalReadiness;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly generatedAt: string;
}

export function computePercentile(values: readonly number[], percentile: number): number {
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

export function buildProjectionOperationalMetrics(
  sample: ProjectionOperationalSample
): ProjectionOperationalMetrics {
  const latencies = sample.processingLatenciesMs.filter((value) => Number.isFinite(value));
  const averageProjectionLatencyMs =
    latencies.length === 0
      ? 0
      : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);

  const lagSample: ProjectionLagSample = {
    projectionName: sample.projectionName,
    lastEventProcessedAt: sample.lastEventProcessedAt,
    evaluatedAt: sample.evaluatedAt,
    checkpointUpdatedAt: sample.checkpointUpdatedAt,
  };
  const lag = buildProjectionLagMetrics(lagSample);

  const driftSample: ProjectionDriftSample = {
    projectionName: sample.projectionName,
    processedEvents: sample.processedEvents,
    duplicateEvents: sample.duplicateEvents,
    droppedEvents: sample.droppedEvents,
    missingEvents: sample.missingEvents,
    outOfOrderEvents: sample.outOfOrderEvents,
  };
  const drift = detectProjectionDrift(driftSample, 100, 100);

  const replay = evaluateProjectionReplayHealth(
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
  const effectiveUptimeMs = Math.max(0, Math.min(workerUptimeMs, sample.windowDurationMs) - downtimeMs);
  const workerUptimePercent = percent(effectiveUptimeMs, Math.max(sample.windowDurationMs, 1));

  const windowMinutes = Math.max(sample.windowDurationMs / 60_000, 1 / 60);
  const projectionThroughputPerMinute =
    Math.round((sample.processedEvents / windowMinutes) * 100) / 100;

  return {
    projectionName: sample.projectionName,
    averageProjectionLatencyMs,
    p95LatencyMs: computePercentile(latencies, 95),
    p99LatencyMs: computePercentile(latencies, 99),
    maximumLagMs: lag.maximumLagMs,
    replaySuccessPercent: replay.replaySuccessPercent,
    duplicatePercent: drift.duplicatePercent,
    droppedEventPercent: drift.droppedEventPercent,
    checkpointAgeMs: lag.checkpointAgeMs,
    workerUptimePercent,
    projectionThroughputPerMinute,
    processedEvents: sample.processedEvents,
    failedEvents: sample.failedEvents,
  };
}

export function evaluateProjectionOperationalHealth(
  metrics: ProjectionOperationalMetrics,
  driftDetected: boolean,
  thresholds: ProjectionOperationalThresholds = DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS
): ProjectionOperationalHealth {
  const reasons: string[] = [];
  const penalties: number[] = [];

  if (metrics.averageProjectionLatencyMs > thresholds.maxAverageLatencyMs) {
    reasons.push(`Average latency ${metrics.averageProjectionLatencyMs}ms exceeds ${thresholds.maxAverageLatencyMs}ms`);
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
    reasons.push(`Replay success ${metrics.replaySuccessPercent}% below ${thresholds.minReplaySuccessPercent}%`);
    penalties.push(10);
  }
  if (metrics.duplicatePercent > thresholds.maxDuplicatePercent) {
    reasons.push(`Duplicate rate ${metrics.duplicatePercent}% exceeds ${thresholds.maxDuplicatePercent}%`);
    penalties.push(8);
  }
  if (metrics.droppedEventPercent > thresholds.maxDroppedEventPercent) {
    reasons.push(`Dropped event rate ${metrics.droppedEventPercent}% exceeds ${thresholds.maxDroppedEventPercent}%`);
    penalties.push(10);
  }
  if (metrics.checkpointAgeMs > thresholds.maxCheckpointAgeMs) {
    reasons.push(`Checkpoint age ${metrics.checkpointAgeMs}ms exceeds ${thresholds.maxCheckpointAgeMs}ms`);
    penalties.push(6);
  }
  if (metrics.workerUptimePercent < thresholds.minWorkerUptimePercent) {
    reasons.push(`Worker uptime ${metrics.workerUptimePercent}% below ${thresholds.minWorkerUptimePercent}%`);
    penalties.push(8);
  }
  if (metrics.projectionThroughputPerMinute < thresholds.minThroughputPerMinute) {
    reasons.push(`Throughput ${metrics.projectionThroughputPerMinute}/min below ${thresholds.minThroughputPerMinute}/min`);
    penalties.push(5);
  }
  if (driftDetected) {
    reasons.push('Projection drift detected');
    penalties.push(10);
  }

  const score = computeOperationalHealthScore(100, penalties);
  let status: ProjectionOperationalHealthStatus = 'GREEN';
  if (penalties.length > 0 && score >= 70) status = 'AMBER';
  if (score < 70 || penalties.length >= 4) status = 'RED';

  if (reasons.length === 0) {
    reasons.push('Operational metrics within thresholds');
  }

  return { status, score, reasons };
}

export function evaluateOperationalReadiness(
  health: ProjectionOperationalHealth,
  metrics: ProjectionOperationalMetrics,
  driftDetected: boolean,
  sampleCount: number,
  thresholds: ProjectionOperationalThresholds = DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS
): ProjectionOperationalReadiness {
  if (sampleCount < thresholds.minSampleSize) return 'NOT_READY';
  if (health.status === 'RED') return 'NOT_READY';
  if (driftDetected || health.status === 'AMBER') return 'REQUIRES_INVESTIGATION';
  if (
    health.status === 'GREEN' &&
    metrics.maximumLagMs <= thresholds.maxLagMs &&
    metrics.replaySuccessPercent >= thresholds.minReplaySuccessPercent &&
    metrics.duplicatePercent <= thresholds.maxDuplicatePercent &&
    metrics.droppedEventPercent <= thresholds.maxDroppedEventPercent
  ) {
    return 'READY_FOR_SWITCH';
  }
  return 'NOT_READY';
}

export function buildOperationalRecommendation(readiness: ProjectionOperationalReadiness): string {
  switch (readiness) {
    case 'READY_FOR_SWITCH':
      return 'Staging operational validation passed. Await 72-hour soak, ARB approval, and explicit production rollout approval before adapter switch.';
    case 'REQUIRES_INVESTIGATION':
      return 'Operational anomalies detected. Investigate lag, drift, or replay issues before proceeding.';
    default:
      return 'Operational validation not ready. Continue staging soak and remediate blockers.';
  }
}

export function buildProjectionOperationalReport(
  reportId: string,
  sample: ProjectionOperationalSample,
  sampleCount: number,
  thresholds: Partial<ProjectionOperationalThresholds> = {}
): ProjectionOperationalReport {
  const resolvedThresholds = mergeProjectionOperationalThresholds(thresholds);
  const metrics = buildProjectionOperationalMetrics(sample);
  const drift = detectProjectionDrift(
    sample,
    resolvedThresholds.maxDuplicatePercent,
    resolvedThresholds.maxDroppedEventPercent
  );
  const health = evaluateProjectionOperationalHealth(metrics, drift.driftDetected, resolvedThresholds);
  const readiness = evaluateOperationalReadiness(
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
    recommendation: buildOperationalRecommendation(readiness),
    blockers,
    generatedAt: sample.evaluatedAt,
  };
}
