/** Pricing operational rules (M8 PR-10). Pure domain — no SDK imports. */

import type { PricingOperationalThresholds } from './PricingOperationalThresholds';
import {
  DEFAULT_PRICING_OPERATIONAL_THRESHOLDS,
  mergePricingOperationalThresholds,
} from './PricingOperationalThresholds';
import {
  buildPricingProjectionLagMetrics,
  type PricingProjectionLagSample,
} from './PricingProjectionLag';
import {
  detectPricingProjectionDrift,
  type PricingProjectionDriftSample,
} from './PricingProjectionDrift';
import { evaluatePricingReplayHealth, type PricingReplaySample } from './PricingReplayHealth';
import {
  computePricingOperationalHealthScore,
  type PricingProjectionHealth,
  type PricingProjectionHealthStatus,
} from './PricingProjectionHealth';

export type PricingOperationalReadiness =
  | 'READY_FOR_SWITCH'
  | 'NOT_READY'
  | 'REQUIRES_INVESTIGATION';

export interface PricingOperationalSample {
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

export interface PricingOperationalMetrics {
  readonly projectionName: string;
  readonly currentLagMs: number;
  readonly maximumLagMs: number;
  readonly checkpointAgeMs: number;
  readonly replaySuccessPercent: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly throughputPerMinute: number;
  readonly workerUptimePercent: number;
  readonly duplicateCount: number;
  readonly missingEventCount: number;
  readonly outOfOrderCount: number;
  readonly projectionDriftCount: number;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly duplicatePercent: number;
  readonly droppedEventPercent: number;
}

export interface PricingOperationalReport {
  readonly reportId: string;
  readonly projectionName: string;
  readonly metrics: PricingOperationalMetrics;
  readonly health: PricingProjectionHealth;
  readonly readiness: PricingOperationalReadiness;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly generatedAt: string;
}

export function computePricingPercentile(values: readonly number[], percentile: number): number {
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

export function buildPricingOperationalMetrics(
  sample: PricingOperationalSample
): PricingOperationalMetrics {
  const latencies = sample.processingLatenciesMs.filter((value) => Number.isFinite(value));
  const averageLatencyMs =
    latencies.length === 0
      ? 0
      : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);

  const lagSample: PricingProjectionLagSample = {
    projectionName: sample.projectionName,
    lastEventProcessedAt: sample.lastEventProcessedAt,
    evaluatedAt: sample.evaluatedAt,
    checkpointUpdatedAt: sample.checkpointUpdatedAt,
  };
  const lag = buildPricingProjectionLagMetrics(lagSample);

  const driftSample: PricingProjectionDriftSample = {
    projectionName: sample.projectionName,
    processedEvents: sample.processedEvents,
    duplicateEvents: sample.duplicateEvents,
    droppedEvents: sample.droppedEvents,
    missingEvents: sample.missingEvents,
    outOfOrderEvents: sample.outOfOrderEvents,
  };
  const drift = detectPricingProjectionDrift(driftSample, 100, 100, 0);

  const replay = evaluatePricingReplayHealth(
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
  const throughputPerMinute = Math.round((sample.processedEvents / windowMinutes) * 100) / 100;

  return {
    projectionName: sample.projectionName,
    currentLagMs: lag.currentLagMs,
    maximumLagMs: lag.maximumLagMs,
    checkpointAgeMs: lag.checkpointAgeMs,
    replaySuccessPercent: replay.replaySuccessPercent,
    averageLatencyMs,
    p95LatencyMs: computePricingPercentile(latencies, 95),
    p99LatencyMs: computePricingPercentile(latencies, 99),
    throughputPerMinute,
    workerUptimePercent,
    duplicateCount: sample.duplicateEvents,
    missingEventCount: sample.missingEvents,
    outOfOrderCount: sample.outOfOrderEvents,
    projectionDriftCount: drift.projectionDriftCount,
    processedEvents: sample.processedEvents,
    failedEvents: sample.failedEvents,
    duplicatePercent: drift.duplicatePercent,
    droppedEventPercent: drift.droppedEventPercent,
  };
}

export function evaluatePricingOperationalHealth(
  metrics: PricingOperationalMetrics,
  driftDetected: boolean,
  thresholds: PricingOperationalThresholds = DEFAULT_PRICING_OPERATIONAL_THRESHOLDS
): PricingProjectionHealth {
  const reasons: string[] = [];
  const penalties: number[] = [];

  if (metrics.averageLatencyMs > thresholds.maxAverageLatencyMs) {
    reasons.push(
      `Average latency ${metrics.averageLatencyMs}ms exceeds ${thresholds.maxAverageLatencyMs}ms`
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
  if (metrics.throughputPerMinute < thresholds.minThroughputPerMinute) {
    reasons.push(
      `Throughput ${metrics.throughputPerMinute}/min below ${thresholds.minThroughputPerMinute}/min`
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

  const score = computePricingOperationalHealthScore(100, penalties);
  let status: PricingProjectionHealthStatus = 'GREEN';
  if (penalties.length > 0 && score >= 70) status = 'AMBER';
  if (score < 70 || penalties.length >= 4) status = 'RED';

  if (reasons.length === 0) {
    reasons.push('Operational metrics within thresholds');
  }

  return { status, score, reasons };
}

export function evaluatePricingOperationalReadiness(
  health: PricingProjectionHealth,
  metrics: PricingOperationalMetrics,
  driftDetected: boolean,
  sampleCount: number,
  thresholds: PricingOperationalThresholds = DEFAULT_PRICING_OPERATIONAL_THRESHOLDS
): PricingOperationalReadiness {
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

export function buildPricingOperationalRecommendation(
  readiness: PricingOperationalReadiness
): string {
  switch (readiness) {
    case 'READY_FOR_SWITCH':
      return 'Pricing operational validation passed. Await ARB approval and explicit adapter switch authorization before read adapter layer.';
    case 'REQUIRES_INVESTIGATION':
      return 'Operational anomalies detected. Investigate lag, drift, or replay issues before proceeding.';
    default:
      return 'Pricing operational validation not ready. Continue soak certification and remediate blockers.';
  }
}

export function buildPricingOperationalReport(
  reportId: string,
  sample: PricingOperationalSample,
  sampleCount: number,
  thresholds: Partial<PricingOperationalThresholds> = {}
): PricingOperationalReport {
  const resolvedThresholds = mergePricingOperationalThresholds(thresholds);
  const metrics = buildPricingOperationalMetrics(sample);
  const drift = detectPricingProjectionDrift(
    sample,
    resolvedThresholds.maxDuplicatePercent,
    resolvedThresholds.maxDroppedEventPercent,
    resolvedThresholds.maxCriticalDriftCount
  );
  const health = evaluatePricingOperationalHealth(metrics, drift.driftDetected, resolvedThresholds);
  const readiness = evaluatePricingOperationalReadiness(
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
    recommendation: buildPricingOperationalRecommendation(readiness),
    blockers,
    generatedAt: sample.evaluatedAt,
  };
}
