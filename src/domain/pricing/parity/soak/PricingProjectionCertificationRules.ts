/**
 * Pricing projection certification rules (M8 PR-9).
 * Pure domain — no infrastructure imports.
 */

import type { PricingParityOutcome } from '../PricingParityResult';
import {
  CRITICAL_PRICING_PARITY_OUTCOMES,
  DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS,
  type PricingProjectionSoakThresholds,
} from './PricingProjectionThresholds';
import {
  clampPricingPercent,
  computePricingHealthScoreValue,
  type PricingProjectionHealthScore,
  type PricingProjectionHealthStatus,
} from './PricingProjectionHealthScore';
import {
  buildPricingReadinessRecommendation,
  type PricingProjectionCertificationStatus,
  type PricingProjectionReadiness,
} from './PricingProjectionReadiness';
import { analyzePricingProjectionTrend, type PricingProjectionTrend } from './PricingProjectionTrend';

export interface PricingProjectionSoakInput {
  readonly totalComparisons: number;
  readonly successfulComparisons: number;
  readonly fieldMismatches: number;
  readonly missingInProjection: number;
  readonly missingInLegacy: number;
  readonly versionMismatches: number;
  readonly unsupported: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly mismatchDistribution: Readonly<Record<string, number>>;
  readonly windowParityPercents: readonly number[];
  readonly criticalMismatchCount: number;
}

export interface PricingProjectionSoakMetrics {
  readonly totalComparisons: number;
  readonly successfulComparisons: number;
  readonly fieldMismatches: number;
  readonly missingInProjection: number;
  readonly missingInLegacy: number;
  readonly versionMismatches: number;
  readonly unsupported: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly parityPercent: number;
  readonly fieldParityPercent: number;
  readonly missingPercent: number;
  readonly mismatchDistribution: Readonly<Record<string, number>>;
}

export interface PricingProjectionCertificationReport {
  readonly certificationId: string;
  readonly metrics: PricingProjectionSoakMetrics;
  readonly health: PricingProjectionHealthScore;
  readonly readiness: PricingProjectionReadiness;
  readonly trend: PricingProjectionTrend;
  readonly generatedAt: string;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return clampPricingPercent((numerator / denominator) * 100);
}

export function buildPricingProjectionSoakMetrics(
  input: PricingProjectionSoakInput
): PricingProjectionSoakMetrics {
  const total = input.totalComparisons;
  const missingTotal = input.missingInProjection + input.missingInLegacy;
  return {
    totalComparisons: total,
    successfulComparisons: input.successfulComparisons,
    fieldMismatches: input.fieldMismatches,
    missingInProjection: input.missingInProjection,
    missingInLegacy: input.missingInLegacy,
    versionMismatches: input.versionMismatches,
    unsupported: input.unsupported,
    averageLatencyMs: input.averageLatencyMs,
    p95LatencyMs: input.p95LatencyMs,
    parityPercent: percent(input.successfulComparisons, total),
    fieldParityPercent: percent(total - input.fieldMismatches, total),
    missingPercent: percent(missingTotal, total),
    mismatchDistribution: input.mismatchDistribution,
  };
}

export function evaluatePricingProjectionHealth(
  metrics: PricingProjectionSoakMetrics,
  thresholds: PricingProjectionSoakThresholds = DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS
): PricingProjectionHealthScore {
  const reasons: string[] = [];
  let penalties = 0;

  if (metrics.totalComparisons < thresholds.minSampleSize) {
    reasons.push(`Insufficient sample size: ${metrics.totalComparisons}/${thresholds.minSampleSize}`);
    penalties += 20;
  }
  if (metrics.missingPercent > thresholds.maxMissingPercent) {
    reasons.push(`Missing ${metrics.missingPercent}% > ${thresholds.maxMissingPercent}%`);
    penalties += 10;
  }
  if (100 - metrics.fieldParityPercent > thresholds.maxFieldMismatchPercent) {
    reasons.push(`Field parity below ${thresholds.readyMinFieldParityPercent}%`);
    penalties += 8;
  }
  if (
    percent(metrics.versionMismatches, metrics.totalComparisons) > thresholds.maxVersionMismatchPercent
  ) {
    reasons.push(`Version mismatch rate exceeds ${thresholds.maxVersionMismatchPercent}%`);
    penalties += 5;
  }
  if (metrics.p95LatencyMs > thresholds.maxP95LatencyMs) {
    reasons.push(`P95 latency ${metrics.p95LatencyMs}ms > ${thresholds.maxP95LatencyMs}ms`);
    penalties += 5;
  }

  const score = computePricingHealthScoreValue(metrics.parityPercent, penalties);
  let status: PricingProjectionHealthStatus = 'RED';
  if (
    metrics.parityPercent >= thresholds.greenMinParityPercent &&
    metrics.fieldParityPercent >= thresholds.readyMinFieldParityPercent &&
    metrics.missingPercent <= thresholds.maxMissingPercent
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

export function hasCriticalPricingMismatch(criticalMismatchCount: number): boolean {
  return criticalMismatchCount > 0;
}

export function evaluatePricingProjectionCertification(
  metrics: PricingProjectionSoakMetrics,
  health: PricingProjectionHealthScore,
  criticalMismatchCount: number,
  thresholds: PricingProjectionSoakThresholds = DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS
): PricingProjectionCertificationStatus {
  if (metrics.totalComparisons < thresholds.minSampleSize) return 'NOT_READY';
  if (health.status === 'RED') return 'NOT_READY';
  if (hasCriticalPricingMismatch(criticalMismatchCount)) return 'NOT_READY';
  if (
    health.status === 'GREEN' &&
    metrics.parityPercent >= thresholds.readyMinParityPercent &&
    metrics.fieldParityPercent >= thresholds.readyMinFieldParityPercent &&
    metrics.missingPercent <= thresholds.maxMissingPercent &&
    metrics.p95LatencyMs <= thresholds.maxP95LatencyMs
  ) {
    return 'READY';
  }
  if (metrics.parityPercent >= thresholds.conditionalMinParityPercent) {
    return 'CONDITIONAL';
  }
  return 'NOT_READY';
}

export function buildPricingProjectionReadiness(
  metrics: PricingProjectionSoakMetrics,
  health: PricingProjectionHealthScore,
  certification: PricingProjectionCertificationStatus,
  generatedAt: string,
  criticalMismatchCount: number,
  thresholds: PricingProjectionSoakThresholds = DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS
): PricingProjectionReadiness {
  const blockers: string[] = [];
  if (metrics.totalComparisons < thresholds.minSampleSize) {
    blockers.push('Insufficient soak sample size');
  }
  if (metrics.parityPercent < thresholds.readyMinParityPercent) {
    blockers.push('Parity below ready threshold');
  }
  if (metrics.fieldParityPercent < thresholds.readyMinFieldParityPercent) {
    blockers.push('Field parity below ready threshold');
  }
  if (metrics.missingPercent > thresholds.maxMissingPercent) {
    blockers.push('Missing rate above threshold');
  }
  if (metrics.p95LatencyMs > thresholds.maxP95LatencyMs) {
    blockers.push('P95 latency above threshold');
  }
  if (health.status === 'RED') {
    blockers.push('Projection health is RED');
  }
  if (hasCriticalPricingMismatch(criticalMismatchCount)) {
    blockers.push('Critical mismatch category detected');
  }

  return {
    certification,
    health: health.status,
    recommendation: buildPricingReadinessRecommendation(certification, health.status),
    blockers,
    generatedAt,
  };
}

export function countPricingOutcome(
  outcomes: readonly PricingParityOutcome[],
  target: PricingParityOutcome
): number {
  return outcomes.filter((outcome) => outcome === target).length;
}

export function isCriticalPricingOutcome(outcome: PricingParityOutcome): boolean {
  return (CRITICAL_PRICING_PARITY_OUTCOMES as readonly string[]).includes(outcome);
}

export function computePricingPercentileLatencies(
  latencies: readonly number[],
  percentile: number
): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

export function buildPricingProjectionCertificationReport(
  certificationId: string,
  input: PricingProjectionSoakInput,
  generatedAt: string,
  thresholds: PricingProjectionSoakThresholds = DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS
): PricingProjectionCertificationReport {
  const metrics = buildPricingProjectionSoakMetrics(input);
  const health = evaluatePricingProjectionHealth(metrics, thresholds);
  const certification = evaluatePricingProjectionCertification(
    metrics,
    health,
    input.criticalMismatchCount,
    thresholds
  );
  const readiness = buildPricingProjectionReadiness(
    metrics,
    health,
    certification,
    generatedAt,
    input.criticalMismatchCount,
    thresholds
  );
  const trend = analyzePricingProjectionTrend(input.windowParityPercents);

  return {
    certificationId,
    metrics,
    health,
    readiness,
    trend,
    generatedAt,
  };
}
