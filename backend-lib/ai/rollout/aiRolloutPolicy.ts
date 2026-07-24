import type { AiObservabilitySnapshot } from '../aiObservabilityContracts.js';
import {
  AI_CANARY_HALT_TRIGGERS,
  AI_CANARY_PROMOTION_BLOCKERS,
  AI_CANARY_ROLLBACK_TRIGGERS,
} from './aiRolloutMetadata.js';
import { measureCanaryErrorRate, type AiPrecheckResult } from './aiRolloutPrechecks.js';
import {
  DEFAULT_AI_CANARY_LIVE_THRESHOLDS,
  type AiCanaryLiveRolloutThresholds,
} from './aiRolloutThresholds.js';
import {
  getNextAiRolloutStage,
  getPreviousAiRolloutStage,
  getAiRolloutStageDefinition,
  type AiRolloutStageId,
} from './aiRolloutStages.js';

export type AiRolloutRoute = 'blocked' | 'allowed';

export type AiRolloutBlockReason =
  | 'FLAG_DISABLED'
  | 'STAGE_ZERO'
  | 'NOT_WIRED_INTO_ASSIST'
  | 'CANARY_INACTIVE'
  | 'HEALTH_GATE'
  | 'OUTSIDE_BUCKET'
  | 'EMPTY_ROUTING_KEY';

export interface AiRolloutHealthGates {
  readonly maxFailureRatePercent: number;
  readonly maxP95LatencyMs: number;
  readonly maxSafetyBlockedRatePercent: number;
  readonly minSampleSize: number;
}

export const DEFAULT_AI_ROLLOUT_HEALTH_GATES: AiRolloutHealthGates = {
  maxFailureRatePercent: 15,
  maxP95LatencyMs: 15_000,
  maxSafetyBlockedRatePercent: 25,
  minSampleSize: 20,
};

export interface AiRolloutRoutingDecision {
  readonly route: AiRolloutRoute;
  readonly reason: AiRolloutBlockReason | 'IN_BUCKET';
  readonly stage: AiRolloutStageId;
  readonly percent: number;
  readonly bucket: number | null;
  readonly canaryFlagEnabled: boolean;
  readonly wiredIntoAssist: boolean;
  readonly healthOk: boolean;
}

export function stableBucket(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export function evaluateAiRolloutHealth(
  observability: AiObservabilitySnapshot | null | undefined,
  gates: AiRolloutHealthGates = DEFAULT_AI_ROLLOUT_HEALTH_GATES,
): { ok: boolean; reason?: string } {
  if (!observability) return { ok: true };

  const window = observability.last1h.totalEvents >= gates.minSampleSize
    ? observability.last1h
    : observability.process;

  if (window.totalEvents < gates.minSampleSize) {
    return { ok: true }; // not enough data to trip the gate
  }

  const failureRate = (window.failureCount / window.totalEvents) * 100;
  if (failureRate > gates.maxFailureRatePercent) {
    return { ok: false, reason: `failureRate ${failureRate.toFixed(1)}%` };
  }

  const safetyRate = (window.safetyBlockedCount / window.totalEvents) * 100;
  if (safetyRate > gates.maxSafetyBlockedRatePercent) {
    return { ok: false, reason: `safetyBlockedRate ${safetyRate.toFixed(1)}%` };
  }

  const p95 = window.latency.p95Ms;
  if (typeof p95 === 'number' && p95 > gates.maxP95LatencyMs) {
    return { ok: false, reason: `p95 ${p95}ms` };
  }

  return { ok: true };
}

/**
 * Evaluate whether a routing key would be allowed under canary policy.
 * Phase 11: wiredIntoAssist is always false → always blocked at the assist boundary.
 * Decision is still computed for status/diagnostics.
 */
export function evaluateAiCanaryRollout(params: {
  readonly canaryFlagEnabled: boolean;
  readonly stage: AiRolloutStageId;
  readonly routingKey: string;
  readonly wiredIntoAssist?: boolean;
  readonly healthOk?: boolean;
}): AiRolloutRoutingDecision {
  const stageDef = getAiRolloutStageDefinition(params.stage);
  const wiredIntoAssist = params.wiredIntoAssist === true;
  const healthOk = params.healthOk !== false;
  const key = params.routingKey.trim();

  const base = {
    stage: stageDef.stage,
    percent: stageDef.percent,
    canaryFlagEnabled: params.canaryFlagEnabled,
    wiredIntoAssist,
    healthOk,
  };

  if (!params.canaryFlagEnabled) {
    return { ...base, route: 'blocked', reason: 'FLAG_DISABLED', bucket: null };
  }
  if (stageDef.stage === 0 || stageDef.percent <= 0) {
    return { ...base, route: 'blocked', reason: 'STAGE_ZERO', bucket: null };
  }
  if (!wiredIntoAssist) {
    return { ...base, route: 'blocked', reason: 'NOT_WIRED_INTO_ASSIST', bucket: null };
  }
  if (!healthOk) {
    return { ...base, route: 'blocked', reason: 'HEALTH_GATE', bucket: null };
  }
  if (!key) {
    return { ...base, route: 'blocked', reason: 'EMPTY_ROUTING_KEY', bucket: null };
  }

  const bucket = stableBucket(key);
  if (bucket < stageDef.percent) {
    return { ...base, route: 'allowed', reason: 'IN_BUCKET', bucket };
  }
  return { ...base, route: 'blocked', reason: 'OUTSIDE_BUCKET', bucket };
}

export interface AiCanaryAssistGateResult {
  /** Whether the assist/cart-plan request may proceed. */
  readonly allow: boolean;
  /** True only when percentage/health filtering was applied. */
  readonly applied: boolean;
  readonly decision: AiRolloutRoutingDecision;
}

/**
 * Phase 13 assist gate — safe defaults:
 * - not wired → allow (no canary filter)
 * - wired but canary flag OFF or stage 0 → allow (canary inactive)
 * - wired + enabled + stage > 0 → bucket + health gate
 */
export function evaluateAiCanaryAssistGate(params: {
  readonly canaryFlagEnabled: boolean;
  readonly stage: AiRolloutStageId;
  readonly routingKey: string;
  readonly wiredIntoAssist: boolean;
  readonly healthOk?: boolean;
}): AiCanaryAssistGateResult {
  const healthOk = params.healthOk !== false;
  const stageDef = getAiRolloutStageDefinition(params.stage);

  if (!params.wiredIntoAssist) {
    const decision = evaluateAiCanaryRollout({
      ...params,
      wiredIntoAssist: false,
      healthOk,
    });
    return { allow: true, applied: false, decision };
  }

  if (!params.canaryFlagEnabled || stageDef.stage === 0 || stageDef.percent <= 0) {
    return {
      allow: true,
      applied: false,
      decision: {
        route: 'allowed',
        reason: 'CANARY_INACTIVE',
        stage: stageDef.stage,
        percent: stageDef.percent,
        bucket: null,
        canaryFlagEnabled: params.canaryFlagEnabled,
        wiredIntoAssist: true,
        healthOk,
      },
    };
  }

  const decision = evaluateAiCanaryRollout({
    ...params,
    wiredIntoAssist: true,
    healthOk,
  });
  return {
    allow: decision.route === 'allowed',
    applied: true,
    decision,
  };
}

/** Resolve stable canary routing key from request identity fields. */
export function resolveAiCanaryRoutingKey(params: {
  readonly explicitKey?: unknown;
  readonly conversationId?: string;
  readonly correlationId?: string;
}): string {
  if (typeof params.explicitKey === 'string' && params.explicitKey.trim()) {
    return params.explicitKey.trim().slice(0, 128);
  }
  if (params.conversationId?.trim()) return params.conversationId.trim();
  if (params.correlationId?.trim()) return params.correlationId.trim();
  return '';
}

export interface AiCanaryPromotionDecision {
  readonly allowed: boolean;
  readonly fromStage: AiRolloutStageId;
  readonly toStage: AiRolloutStageId | null;
  readonly reason: string;
  readonly blockers: readonly string[];
  readonly advisoryOnly: true;
}

export interface AiCanaryHaltDecision {
  readonly haltRecommended: boolean;
  readonly reason: string;
  readonly triggeredBy: string;
  readonly advisoryOnly: true;
}

export interface AiCanaryRollbackDecision {
  readonly required: boolean;
  readonly recommendedStage: AiRolloutStageId;
  readonly reason: string;
  readonly triggeredBy: string;
  readonly advisoryOnly: true;
}

function soakHoursElapsed(stageSetAt: string | undefined, nowMs: number): number | null {
  if (!stageSetAt) return null;
  const t = Date.parse(stageSetAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (nowMs - t) / 3_600_000);
}

/**
 * Phase 25 — advisory halt: freeze widening (do not promote). Does not mutate env.
 */
export function evaluateAiCanaryHaltGate(params: {
  readonly observability: AiObservabilitySnapshot | null | undefined;
  readonly thresholds?: AiCanaryLiveRolloutThresholds;
}): AiCanaryHaltDecision {
  const thresholds = params.thresholds ?? DEFAULT_AI_CANARY_LIVE_THRESHOLDS;
  const health = evaluateAiRolloutHealth(params.observability, thresholds.halt);
  if (!health.ok) {
    const trigger =
      health.reason?.includes('safety')
        ? AI_CANARY_HALT_TRIGGERS.SAFETY_SPIKE
        : health.reason?.includes('p95')
          ? AI_CANARY_HALT_TRIGGERS.LATENCY_SPIKE
          : AI_CANARY_HALT_TRIGGERS.FAILURE_SPIKE;
    return {
      haltRecommended: true,
      reason: health.reason ?? 'Halt health gate failed',
      triggeredBy: trigger,
      advisoryOnly: true,
    };
  }

  const canaryErrors = measureCanaryErrorRate(
    params.observability,
    thresholds.halt.minSampleSize,
  );
  if (
    canaryErrors.sampleSize >= thresholds.halt.minSampleSize &&
    canaryErrors.ratePercent > thresholds.maxCanaryErrorRatePercent
  ) {
    return {
      haltRecommended: true,
      reason: `canaryErrorRate ${canaryErrors.ratePercent.toFixed(1)}%`,
      triggeredBy: AI_CANARY_HALT_TRIGGERS.CANARY_ERROR_SPIKE,
      advisoryOnly: true,
    };
  }

  return {
    haltRecommended: false,
    reason: 'No halt recommended',
    triggeredBy: AI_CANARY_HALT_TRIGGERS.NONE,
    advisoryOnly: true,
  };
}

/**
 * Phase 25 — advisory rollback: recommend lower stage / disable. Ops applies manually.
 */
export function evaluateAiCanaryRollbackDecision(params: {
  readonly currentStage: AiRolloutStageId;
  readonly observability: AiObservabilitySnapshot | null | undefined;
  readonly shadowDriftRate?: number | null;
  readonly thresholds?: AiCanaryLiveRolloutThresholds;
}): AiCanaryRollbackDecision {
  const thresholds = params.thresholds ?? DEFAULT_AI_CANARY_LIVE_THRESHOLDS;
  const recommendedStage = getPreviousAiRolloutStage(params.currentStage);

  const health = evaluateAiRolloutHealth(params.observability, thresholds.rollback);
  if (!health.ok) {
    const trigger =
      health.reason?.includes('safety')
        ? AI_CANARY_ROLLBACK_TRIGGERS.SAFETY_BREACH
        : health.reason?.includes('p95')
          ? AI_CANARY_ROLLBACK_TRIGGERS.LATENCY_BREACH
          : AI_CANARY_ROLLBACK_TRIGGERS.HEALTH_BREACH;
    return {
      required: true,
      recommendedStage: params.currentStage > 0 ? 0 : recommendedStage,
      reason: health.reason ?? 'Rollback health breach',
      triggeredBy: trigger,
      advisoryOnly: true,
    };
  }

  if (
    typeof params.shadowDriftRate === 'number' &&
    params.shadowDriftRate > thresholds.shadowMaxDriftRate
  ) {
    return {
      required: true,
      recommendedStage,
      reason: `shadowDriftRate ${(params.shadowDriftRate * 100).toFixed(1)}%`,
      triggeredBy: AI_CANARY_ROLLBACK_TRIGGERS.SHADOW_DRIFT,
      advisoryOnly: true,
    };
  }

  return {
    required: false,
    recommendedStage: params.currentStage,
    reason: 'No rollback required',
    triggeredBy: AI_CANARY_ROLLBACK_TRIGGERS.NONE,
    advisoryOnly: true,
  };
}

/**
 * Phase 25 — advisory promotion gate. Never mutates stage; requires manualApprovalGranted.
 */
export function evaluateAiCanaryPromotionGate(params: {
  readonly liveRolloutGatesEnabled: boolean;
  readonly canaryFlagEnabled: boolean;
  readonly wiredIntoAssist: boolean;
  readonly currentStage: AiRolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly gatewayReady: boolean;
  readonly observability: AiObservabilitySnapshot | null | undefined;
  readonly golden: AiPrecheckResult;
  readonly shadow: AiPrecheckResult;
  readonly stageSetAt?: string;
  readonly nowMs?: number;
  readonly thresholds?: AiCanaryLiveRolloutThresholds;
}): AiCanaryPromotionDecision {
  const thresholds = params.thresholds ?? DEFAULT_AI_CANARY_LIVE_THRESHOLDS;
  const toStage = getNextAiRolloutStage(params.currentStage);
  const blockers: string[] = [];
  const nowMs = params.nowMs ?? Date.now();

  if (!params.liveRolloutGatesEnabled) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.GATES_DISABLED);
  }
  if (!params.canaryFlagEnabled) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.FLAG_DISABLED);
  }
  if (!params.wiredIntoAssist) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.NOT_WIRED);
  }
  if (!params.manualApprovalGranted) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.MANUAL_APPROVAL_REQUIRED);
  }
  if (!params.gatewayReady) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.GATEWAY_NOT_READY);
  }
  if (!toStage) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.STAGE_AT_MAX);
  }

  const routingHealth = evaluateAiRolloutHealth(
    params.observability,
    thresholds.routingHealth,
  );
  if (!routingHealth.ok) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.HEALTH_FAILING);
  }

  const halt = evaluateAiCanaryHaltGate({
    observability: params.observability,
    thresholds,
  });
  if (halt.haltRecommended) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.HALT_ACTIVE);
  }

  const rollback = evaluateAiCanaryRollbackDecision({
    currentStage: params.currentStage,
    observability: params.observability,
    thresholds,
  });
  if (rollback.required) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.ROLLBACK_REQUIRED);
  }

  if (params.golden.blockerCode) {
    blockers.push(params.golden.blockerCode);
  }
  if (params.shadow.blockerCode) {
    blockers.push(params.shadow.blockerCode);
  }

  const soakHours = soakHoursElapsed(params.stageSetAt, nowMs);
  if (
    params.liveRolloutGatesEnabled &&
    params.currentStage > 0 &&
    (soakHours === null || soakHours < thresholds.minSoakHours)
  ) {
    blockers.push(AI_CANARY_PROMOTION_BLOCKERS.SOAK_INCOMPLETE);
  }

  const uniqueBlockers = [...new Set(blockers)];
  const allowed = uniqueBlockers.length === 0 && toStage !== null;

  return {
    allowed,
    fromStage: params.currentStage,
    toStage: allowed ? toStage : toStage,
    reason: allowed
      ? `Promotion to stage ${toStage} advisory-cleared (apply AI_CANARY_ROLLOUT_STAGE manually)`
      : `Promotion blocked (${uniqueBlockers.length} blocker(s))`,
    blockers: uniqueBlockers,
    advisoryOnly: true,
  };
}
