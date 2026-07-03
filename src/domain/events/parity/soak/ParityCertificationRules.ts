/** Parity certification rules (M6 PR-9). Pure domain — no SDK imports. */

import type { OrderParityOutcome } from '../order/OrderParityResult';
import type { ParitySoakThresholds } from './ParityThresholds';
import { DEFAULT_PARITY_SOAK_THRESHOLDS } from './ParityThresholds';
import {
  clampPercent,
  computeHealthScoreValue,
  type ParityHealthScore,
  type ProjectionHealthStatus,
} from './ParityHealthScore';
import {
  buildReadinessRecommendation,
  type ParityCertificationStatus,
  type ParityReadiness,
} from './ParityReadiness';
import { analyzeParityTrend, type ParityTrend } from './ParityTrend';

export interface ParitySoakInput {
  readonly totalComparisons: number;
  readonly successfulComparisons: number;
  readonly fieldMismatches: number;
  readonly missingProjections: number;
  readonly missingLegacy: number;
  readonly versionMismatches: number;
  readonly unsupportedEvents: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly mismatchDistribution: Readonly<Record<string, number>>;
  readonly windowParityPercents: readonly number[];
}

export interface ParitySoakMetrics {
  readonly totalComparisons: number;
  readonly successfulComparisons: number;
  readonly fieldMismatches: number;
  readonly missingProjections: number;
  readonly missingLegacy: number;
  readonly versionMismatches: number;
  readonly unsupportedEvents: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly parityPercent: number;
  readonly fieldParityPercent: number;
  readonly missingProjectionPercent: number;
  readonly missingLegacyPercent: number;
  readonly mismatchDistribution: Readonly<Record<string, number>>;
}

export interface ParityCertificationReport {
  readonly certificationId: string;
  readonly metrics: ParitySoakMetrics;
  readonly health: ParityHealthScore;
  readonly readiness: ParityReadiness;
  readonly trend: ParityTrend;
  readonly generatedAt: string;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return clampPercent((numerator / denominator) * 100);
}

export function buildParitySoakMetrics(input: ParitySoakInput): ParitySoakMetrics {
  const total = input.totalComparisons;
  return {
    totalComparisons: total,
    successfulComparisons: input.successfulComparisons,
    fieldMismatches: input.fieldMismatches,
    missingProjections: input.missingProjections,
    missingLegacy: input.missingLegacy,
    versionMismatches: input.versionMismatches,
    unsupportedEvents: input.unsupportedEvents,
    averageLatencyMs: input.averageLatencyMs,
    p95LatencyMs: input.p95LatencyMs,
    parityPercent: percent(input.successfulComparisons, total),
    fieldParityPercent: percent(total - input.fieldMismatches, total),
    missingProjectionPercent: percent(input.missingProjections, total),
    missingLegacyPercent: percent(input.missingLegacy, total),
    mismatchDistribution: input.mismatchDistribution,
  };
}

export function evaluateProjectionHealth(
  metrics: ParitySoakMetrics,
  thresholds: ParitySoakThresholds = DEFAULT_PARITY_SOAK_THRESHOLDS
): ParityHealthScore {
  const reasons: string[] = [];
  let penalties = 0;

  if (metrics.totalComparisons < thresholds.minSampleSize) {
    reasons.push(`Insufficient sample size: ${metrics.totalComparisons}/${thresholds.minSampleSize}`);
    penalties += 20;
  }
  if (metrics.missingProjectionPercent > thresholds.maxMissingProjectionPercent) {
    reasons.push(
      `Missing projection ${metrics.missingProjectionPercent}% > ${thresholds.maxMissingProjectionPercent}%`
    );
    penalties += 10;
  }
  if (metrics.missingLegacyPercent > thresholds.maxMissingLegacyPercent) {
    reasons.push(
      `Missing legacy ${metrics.missingLegacyPercent}% > ${thresholds.maxMissingLegacyPercent}%`
    );
    penalties += 10;
  }
  if (
    percent(metrics.fieldMismatches, metrics.totalComparisons) > thresholds.maxFieldMismatchPercent
  ) {
    reasons.push(`Field mismatch rate exceeds ${thresholds.maxFieldMismatchPercent}%`);
    penalties += 8;
  }
  if (
    percent(metrics.versionMismatches, metrics.totalComparisons) >
    thresholds.maxVersionMismatchPercent
  ) {
    reasons.push(`Version mismatch rate exceeds ${thresholds.maxVersionMismatchPercent}%`);
    penalties += 5;
  }
  if (metrics.p95LatencyMs > thresholds.maxP95LatencyMs) {
    reasons.push(`P95 latency ${metrics.p95LatencyMs}ms > ${thresholds.maxP95LatencyMs}ms`);
    penalties += 5;
  }

  const score = computeHealthScoreValue(metrics.parityPercent, penalties);
  let status: ProjectionHealthStatus = 'RED';
  if (
    metrics.parityPercent >= thresholds.greenMinParityPercent &&
    metrics.missingProjectionPercent <= thresholds.maxMissingProjectionPercent &&
    metrics.missingLegacyPercent <= thresholds.maxMissingLegacyPercent &&
    percent(metrics.fieldMismatches, metrics.totalComparisons) <= thresholds.maxFieldMismatchPercent
  ) {
    status = 'GREEN';
  } else if (metrics.parityPercent >= thresholds.amberMinParityPercent) {
    status = 'AMBER';
  }

  if (reasons.length === 0) {
    reasons.push(`Parity at ${metrics.parityPercent}%`);
  }

  return { status, score, parityPercent: metrics.parityPercent, reasons };
}

export function evaluateParityCertification(
  metrics: ParitySoakMetrics,
  health: ParityHealthScore,
  thresholds: ParitySoakThresholds = DEFAULT_PARITY_SOAK_THRESHOLDS
): ParityCertificationStatus {
  if (metrics.totalComparisons < thresholds.minSampleSize) return 'NOT_READY';
  if (health.status === 'RED') return 'NOT_READY';
  if (
    health.status === 'GREEN' &&
    metrics.parityPercent >= thresholds.readyMinParityPercent &&
    metrics.p95LatencyMs <= thresholds.maxP95LatencyMs
  ) {
    return 'READY';
  }
  if (metrics.parityPercent >= thresholds.conditionalMinParityPercent) {
    return 'CONDITIONAL';
  }
  return 'NOT_READY';
}

export function buildParityReadiness(
  metrics: ParitySoakMetrics,
  health: ParityHealthScore,
  certification: ParityCertificationStatus,
  generatedAt: string,
  thresholds: ParitySoakThresholds = DEFAULT_PARITY_SOAK_THRESHOLDS
): ParityReadiness {
  const blockers: string[] = [];
  if (metrics.totalComparisons < thresholds.minSampleSize) {
    blockers.push('Insufficient soak sample size');
  }
  if (metrics.parityPercent < thresholds.readyMinParityPercent) {
    blockers.push('Parity below ready threshold');
  }
  if (metrics.p95LatencyMs > thresholds.maxP95LatencyMs) {
    blockers.push('P95 latency above threshold');
  }
  if (health.status === 'RED') {
    blockers.push('Projection health is RED');
  }

  return {
    certification,
    health: health.status,
    recommendation: buildReadinessRecommendation(certification, health.status),
    blockers,
    generatedAt,
  };
}

export function countOutcome(outcomes: readonly OrderParityOutcome[], target: OrderParityOutcome): number {
  return outcomes.filter((outcome) => outcome === target).length;
}

export function computePercentileLatencies(latencies: readonly number[], percentile: number): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

export function buildCertificationReport(
  certificationId: string,
  input: ParitySoakInput,
  generatedAt: string,
  thresholds: ParitySoakThresholds = DEFAULT_PARITY_SOAK_THRESHOLDS
): ParityCertificationReport {
  const metrics = buildParitySoakMetrics(input);
  const health = evaluateProjectionHealth(metrics, thresholds);
  const certification = evaluateParityCertification(metrics, health, thresholds);
  const readiness = buildParityReadiness(metrics, health, certification, generatedAt, thresholds);
  const trend = analyzeParityTrend(input.windowParityPercents);

  return {
    certificationId,
    metrics,
    health,
    readiness,
    trend,
    generatedAt,
  };
}
