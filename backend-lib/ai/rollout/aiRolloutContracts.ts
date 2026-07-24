import { isAiGatewayReady, readAiGatewayConfig } from '../aiGatewayConfig.js';
import { getAiObservabilitySnapshot } from '../aiMetricsCollector.js';
import { getLastGoldenEvalReport } from '../eval/lastGoldenEvalStore.js';
import { readAiShadowTrafficConfig } from '../aiShadowTrafficConfig.js';
import { getLastShadowCompareReport } from '../shadow/lastShadowCompareStore.js';
import { readAiCanaryRolloutConfig } from './aiRolloutConfig.js';
import {
  evaluateAiCanaryAssistGate,
  evaluateAiCanaryHaltGate,
  evaluateAiCanaryPromotionGate,
  evaluateAiCanaryRollbackDecision,
  evaluateAiCanaryRollout,
  evaluateAiRolloutHealth,
  type AiCanaryHaltDecision,
  type AiCanaryPromotionDecision,
  type AiCanaryRollbackDecision,
  type AiRolloutRoutingDecision,
} from './aiRolloutPolicy.js';
import {
  evaluateGoldenPrecheck,
  evaluateShadowPrecheck,
  type AiPrecheckResult,
} from './aiRolloutPrechecks.js';
import { getAiRolloutStageDefinition, getNextAiRolloutStage } from './aiRolloutStages.js';
import { readAiCanaryLiveRolloutThresholds } from './aiRolloutThresholds.js';

export const AI_ROLLOUT_SCHEMA_VERSION = '25.0' as const;

/** Stable canary snapshot for status / ops (Phase 11+; live gates advisory in Phase 25). */
export interface AiCanaryRolloutSnapshot {
  readonly schemaVersion: typeof AI_ROLLOUT_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly mutatedState: false;
  readonly canaryFlagEnabled: boolean;
  readonly wiredIntoAssist: boolean;
  readonly liveRolloutGatesEnabled: boolean;
  readonly currentStage: number;
  readonly percent: number;
  readonly label: string;
  readonly nextStage: number | null;
  readonly healthOk: boolean;
  readonly healthReason?: string;
  /** Diagnostic policy decision (may show blocked even when assist still allowed). */
  readonly sampleDecision: AiRolloutRoutingDecision;
  /** Assist-gate view with safe defaults (unwired/inactive → allow). */
  readonly sampleAssistGate: {
    readonly allow: boolean;
    readonly applied: boolean;
    readonly reason: string;
  };
  readonly prechecks: {
    readonly golden: AiPrecheckResult;
    readonly shadow: AiPrecheckResult;
  };
  readonly promotion: AiCanaryPromotionDecision;
  readonly halt: AiCanaryHaltDecision;
  readonly rollback: AiCanaryRollbackDecision;
  readonly thresholds: {
    readonly goldenMinPassRate: number;
    readonly shadowMinSamples: number;
    readonly shadowMaxDriftRate: number;
    readonly minSoakHours: number;
    readonly maxCanaryErrorRatePercent: number;
  };
  /**
   * Auditability of stage changes — gates never mutate stage.
   * Advancement is always a human env/config change with evidence below.
   */
  readonly advancement: {
    readonly autoPromote: false;
    readonly method: 'manual_env';
    readonly manualApprovalGranted: boolean;
    readonly stageSetAt: string | null;
    readonly requiresHumanApproval: true;
    readonly note: string;
  };
  readonly note: string;
}

export function buildAiCanaryRolloutSnapshot(
  env: NodeJS.ProcessEnv = process.env,
  nowMs: number = Date.now(),
): AiCanaryRolloutSnapshot {
  const config = readAiCanaryRolloutConfig(env);
  const thresholds = readAiCanaryLiveRolloutThresholds(env);
  const stageDef = getAiRolloutStageDefinition(config.stage);
  const nextStage = getNextAiRolloutStage(config.stage);
  const observability = getAiObservabilitySnapshot(nowMs);
  const health = evaluateAiRolloutHealth(observability, thresholds.routingHealth);
  const gateway = readAiGatewayConfig(env);
  const gatewayReady = isAiGatewayReady(gateway);
  const shadowConfig = readAiShadowTrafficConfig(env);
  const lastShadow = getLastShadowCompareReport();
  const lastGolden = getLastGoldenEvalReport();
  const manualApprovalGranted = env.AI_CANARY_MANUAL_APPROVAL_GRANTED === 'true';

  const golden = evaluateGoldenPrecheck({
    gatesEnabled: config.liveRolloutGatesEnabled,
    report: lastGolden.report,
    envOverride: env.AI_CANARY_GOLDEN_PRECHECK_PASSED,
    minPassRate: thresholds.goldenMinPassRate,
  });
  const shadow = evaluateShadowPrecheck({
    gatesEnabled: config.liveRolloutGatesEnabled,
    shadowCaptureEnabled: shadowConfig.enabled,
    report: lastShadow.report,
    thresholds,
  });

  const shadowDriftRate =
    lastShadow.report && lastShadow.report.total > 0
      ? lastShadow.report.driftCount / lastShadow.report.total
      : null;

  const halt = evaluateAiCanaryHaltGate({ observability, thresholds });
  const rollback = evaluateAiCanaryRollbackDecision({
    currentStage: config.stage,
    observability,
    shadowDriftRate,
    thresholds,
  });
  const promotion = evaluateAiCanaryPromotionGate({
    liveRolloutGatesEnabled: config.liveRolloutGatesEnabled,
    canaryFlagEnabled: config.enabled,
    wiredIntoAssist: config.wiredIntoAssist,
    currentStage: config.stage,
    manualApprovalGranted,
    gatewayReady,
    observability,
    golden,
    shadow,
    stageSetAt: config.stageSetAt,
    nowMs,
    thresholds,
  });

  const sampleDecision = evaluateAiCanaryRollout({
    canaryFlagEnabled: config.enabled,
    stage: config.stage,
    routingKey: 'phase25-diagnostic',
    wiredIntoAssist: config.wiredIntoAssist,
    healthOk: health.ok,
  });
  const sampleAssistGate = evaluateAiCanaryAssistGate({
    canaryFlagEnabled: config.enabled,
    stage: config.stage,
    routingKey: 'phase25-diagnostic',
    wiredIntoAssist: config.wiredIntoAssist,
    healthOk: health.ok,
  });

  return {
    schemaVersion: AI_ROLLOUT_SCHEMA_VERSION,
    generatedAt: new Date(nowMs).toISOString(),
    mutatedState: false,
    canaryFlagEnabled: config.enabled,
    wiredIntoAssist: config.wiredIntoAssist,
    liveRolloutGatesEnabled: config.liveRolloutGatesEnabled,
    currentStage: stageDef.stage,
    percent: stageDef.percent,
    label: stageDef.label,
    nextStage,
    healthOk: health.ok,
    ...(health.reason ? { healthReason: health.reason } : {}),
    sampleDecision,
    sampleAssistGate: {
      allow: sampleAssistGate.allow,
      applied: sampleAssistGate.applied,
      reason: sampleAssistGate.decision.reason,
    },
    prechecks: { golden, shadow },
    promotion,
    halt,
    rollback,
    thresholds: {
      goldenMinPassRate: thresholds.goldenMinPassRate,
      shadowMinSamples: thresholds.shadowMinSamples,
      shadowMaxDriftRate: thresholds.shadowMaxDriftRate,
      minSoakHours: thresholds.minSoakHours,
      maxCanaryErrorRatePercent: thresholds.maxCanaryErrorRatePercent,
    },
    advancement: {
      autoPromote: false,
      method: 'manual_env',
      manualApprovalGranted,
      stageSetAt: config.stageSetAt ?? null,
      requiresHumanApproval: true,
      note:
        'Stage changes require human env update (AI_CANARY_ROLLOUT_STAGE + AI_CANARY_ROLLOUT_STAGE_SET_AT) after explicit approval; gates never mutate stage.',
    },
    note: config.liveRolloutGatesEnabled
      ? 'Phase 25: live rollout gates are advisory only — no auto-promote. Apply AI_CANARY_ROLLOUT_STAGE / flags manually after promotion.allowed.'
      : config.wiredIntoAssist
        ? 'Phase 13: canary gate is wired into assist. Filtering applies only when AI_CANARY_ROLLOUT_ENABLED=true and stage > 0. Set AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=true for promotion/halt/rollback advice.'
        : 'Canary assist gate is NOT wired (AI_CANARY_WIRED_INTO_ASSIST≠true). Assist traffic uses AI_GATEWAY_ENABLED only. Live gates advisory when AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=true.',
  };
}
