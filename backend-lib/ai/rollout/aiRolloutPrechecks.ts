import type { AiObservabilitySnapshot } from '../aiObservabilityContracts.js';
import type { GoldenEvalReport } from '../eval/types.js';
import type { ShadowCompareReport } from '../shadow/aiShadowCompareReport.js';
import { AI_CANARY_PROMOTION_BLOCKERS } from './aiRolloutMetadata.js';
import type { AiCanaryLiveRolloutThresholds } from './aiRolloutThresholds.js';

export type AiPrecheckStatus = 'pass' | 'fail' | 'unknown' | 'skipped';

export interface AiPrecheckResult {
  readonly status: AiPrecheckStatus;
  readonly reason: string;
  readonly blockerCode?: string;
}

export function evaluateGoldenPrecheck(params: {
  readonly gatesEnabled: boolean;
  readonly report?: GoldenEvalReport | null;
  /** Explicit ops/CI override: 'true' | 'false' | unset */
  readonly envOverride?: string | undefined;
  readonly minPassRate: number;
}): AiPrecheckResult {
  if (!params.gatesEnabled) {
    return { status: 'skipped', reason: 'Live rollout gates disabled' };
  }
  if (params.envOverride === 'true') {
    return { status: 'pass', reason: 'AI_CANARY_GOLDEN_PRECHECK_PASSED=true' };
  }
  if (params.envOverride === 'false') {
    return {
      status: 'fail',
      reason: 'AI_CANARY_GOLDEN_PRECHECK_PASSED=false',
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.GOLDEN_FAILED,
    };
  }
  if (!params.report) {
    return {
      status: 'unknown',
      reason: 'No golden eval report available — run npm run test:ai:golden',
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.GOLDEN_UNKNOWN,
    };
  }
  const passRate = params.report.total > 0 ? params.report.passed / params.report.total : 0;
  if (params.report.failed > 0 || passRate < params.minPassRate) {
    return {
      status: 'fail',
      reason: `Golden eval ${params.report.passed}/${params.report.total} (min pass rate ${params.minPassRate})`,
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.GOLDEN_FAILED,
    };
  }
  return {
    status: 'pass',
    reason: `Golden eval ${params.report.passed}/${params.report.total}`,
  };
}

export function evaluateShadowPrecheck(params: {
  readonly gatesEnabled: boolean;
  readonly shadowCaptureEnabled: boolean;
  readonly report?: ShadowCompareReport | null;
  readonly thresholds: Pick<
    AiCanaryLiveRolloutThresholds,
    'shadowMinSamples' | 'shadowMaxDriftRate'
  >;
}): AiPrecheckResult {
  if (!params.gatesEnabled) {
    return { status: 'skipped', reason: 'Live rollout gates disabled' };
  }
  if (!params.shadowCaptureEnabled && !params.report) {
    return {
      status: 'unknown',
      reason: 'Shadow capture OFF and no replay report — run shadow compare before promoting',
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.SHADOW_INSUFFICIENT,
    };
  }
  if (!params.report) {
    return {
      status: 'unknown',
      reason: 'No shadow compare report yet — POST /api/ops/ai/shadow/replay',
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.SHADOW_INSUFFICIENT,
    };
  }
  if (params.report.total < params.thresholds.shadowMinSamples) {
    return {
      status: 'fail',
      reason: `Shadow samples ${params.report.total} < min ${params.thresholds.shadowMinSamples}`,
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.SHADOW_INSUFFICIENT,
    };
  }
  const driftRate =
    params.report.total > 0 ? params.report.driftCount / params.report.total : 0;
  if (driftRate > params.thresholds.shadowMaxDriftRate) {
    return {
      status: 'fail',
      reason: `Shadow drift rate ${(driftRate * 100).toFixed(1)}% > max ${(params.thresholds.shadowMaxDriftRate * 100).toFixed(1)}%`,
      blockerCode: AI_CANARY_PROMOTION_BLOCKERS.SHADOW_FAILED,
    };
  }
  return {
    status: 'pass',
    reason: `Shadow compare ${params.report.passed}/${params.report.total} (drift ${params.report.driftCount})`,
  };
}

/** Share of AI_CANARY_* error codes in the preferred observability window. */
export function measureCanaryErrorRate(
  observability: AiObservabilitySnapshot | null | undefined,
  minSampleSize: number,
): { ratePercent: number; sampleSize: number } {
  if (!observability) return { ratePercent: 0, sampleSize: 0 };
  const window =
    observability.last1h.totalEvents >= minSampleSize
      ? observability.last1h
      : observability.process;
  const total = window.totalEvents;
  if (total <= 0) return { ratePercent: 0, sampleSize: 0 };
  let canaryErrors = 0;
  for (const [code, count] of Object.entries(window.byErrorCode ?? {})) {
    if (code.startsWith('AI_CANARY_')) canaryErrors += count;
  }
  return { ratePercent: (canaryErrors / total) * 100, sampleSize: total };
}
