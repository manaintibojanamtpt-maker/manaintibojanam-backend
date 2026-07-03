/**
 * Menu projection certification rules (M7 PR-9).
 * Pure domain — no infrastructure imports.
 */

import type { MenuParityOutcome } from '../MenuParityResult';
import {
  CRITICAL_MENU_PARITY_OUTCOMES,
  DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS,
  type MenuProjectionSoakThresholds,
} from './MenuProjectionThresholds';
import {
  clampMenuPercent,
  computeMenuHealthScoreValue,
  type MenuProjectionHealthScore,
  type MenuProjectionHealthStatus,
} from './MenuProjectionHealthScore';
import {
  buildMenuReadinessRecommendation,
  type MenuProjectionCertificationStatus,
  type MenuProjectionReadiness,
} from './MenuProjectionReadiness';
import { analyzeMenuProjectionTrend, type MenuProjectionTrend } from './MenuProjectionTrend';

export interface MenuProjectionSoakInput {
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

export interface MenuProjectionSoakMetrics {
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

export interface MenuProjectionCertificationReport {
  readonly certificationId: string;
  readonly metrics: MenuProjectionSoakMetrics;
  readonly health: MenuProjectionHealthScore;
  readonly readiness: MenuProjectionReadiness;
  readonly trend: MenuProjectionTrend;
  readonly generatedAt: string;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return clampMenuPercent((numerator / denominator) * 100);
}

export function buildMenuProjectionSoakMetrics(input: MenuProjectionSoakInput): MenuProjectionSoakMetrics {
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

export function evaluateMenuProjectionHealth(
  metrics: MenuProjectionSoakMetrics,
  thresholds: MenuProjectionSoakThresholds = DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS
): MenuProjectionHealthScore {
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

  const score = computeMenuHealthScoreValue(metrics.parityPercent, penalties);
  let status: MenuProjectionHealthStatus = 'RED';
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

export function hasCriticalMenuMismatch(criticalMismatchCount: number): boolean {
  return criticalMismatchCount > 0;
}

export function evaluateMenuProjectionCertification(
  metrics: MenuProjectionSoakMetrics,
  health: MenuProjectionHealthScore,
  criticalMismatchCount: number,
  thresholds: MenuProjectionSoakThresholds = DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS
): MenuProjectionCertificationStatus {
  if (metrics.totalComparisons < thresholds.minSampleSize) return 'NOT_READY';
  if (health.status === 'RED') return 'NOT_READY';
  if (hasCriticalMenuMismatch(criticalMismatchCount)) return 'NOT_READY';
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

export function buildMenuProjectionReadiness(
  metrics: MenuProjectionSoakMetrics,
  health: MenuProjectionHealthScore,
  certification: MenuProjectionCertificationStatus,
  generatedAt: string,
  criticalMismatchCount: number,
  thresholds: MenuProjectionSoakThresholds = DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS
): MenuProjectionReadiness {
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
  if (hasCriticalMenuMismatch(criticalMismatchCount)) {
    blockers.push('Critical mismatch category detected');
  }

  return {
    certification,
    health: health.status,
    recommendation: buildMenuReadinessRecommendation(certification, health.status),
    blockers,
    generatedAt,
  };
}

export function countMenuOutcome(
  outcomes: readonly MenuParityOutcome[],
  target: MenuParityOutcome
): number {
  return outcomes.filter((outcome) => outcome === target).length;
}

export function isCriticalMenuOutcome(outcome: MenuParityOutcome): boolean {
  return (CRITICAL_MENU_PARITY_OUTCOMES as readonly string[]).includes(outcome);
}

export function computeMenuPercentileLatencies(
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

export function buildMenuProjectionCertificationReport(
  certificationId: string,
  input: MenuProjectionSoakInput,
  generatedAt: string,
  thresholds: MenuProjectionSoakThresholds = DEFAULT_MENU_PROJECTION_SOAK_THRESHOLDS
): MenuProjectionCertificationReport {
  const metrics = buildMenuProjectionSoakMetrics(input);
  const health = evaluateMenuProjectionHealth(metrics, thresholds);
  const certification = evaluateMenuProjectionCertification(
    metrics,
    health,
    input.criticalMismatchCount,
    thresholds
  );
  const readiness = buildMenuProjectionReadiness(
    metrics,
    health,
    certification,
    generatedAt,
    input.criticalMismatchCount,
    thresholds
  );
  const trend = analyzeMenuProjectionTrend(input.windowParityPercents);

  return {
    certificationId,
    metrics,
    health,
    readiness,
    trend,
    generatedAt,
  };
}
