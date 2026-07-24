import { normalizeAiRolloutStage, type AiRolloutStageId } from './aiRolloutStages.js';

export interface AiCanaryRolloutConfig {
  /** Must be explicitly true — percentage filtering only when also wired + stage > 0. */
  readonly enabled: boolean;
  /** Default stage 0 (0%). Env AI_CANARY_ROLLOUT_STAGE. */
  readonly stage: AiRolloutStageId;
  /**
   * When false (default), assist is not filtered by canary.
   * Set AI_CANARY_WIRED_INTO_ASSIST=true to activate Phase 13 gating.
   */
  readonly wiredIntoAssist: boolean;
  /**
   * Phase 25 — advisory promotion/halt/rollback gates on status/ops.
   * Does not auto-promote or mutate stage. Default false.
   */
  readonly liveRolloutGatesEnabled: boolean;
  /** Optional ISO timestamp when current stage was set (soak precheck). */
  readonly stageSetAt?: string;
}

/**
 * Canary rollout config. Defaults: enabled=false, stage=0, wiredIntoAssist=false.
 * Zero traffic change until all three are deliberately set for a non-zero stage.
 */
export function readAiCanaryRolloutConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiCanaryRolloutConfig {
  const stageSetAt = env.AI_CANARY_ROLLOUT_STAGE_SET_AT?.trim();
  return {
    enabled: env.AI_CANARY_ROLLOUT_ENABLED === 'true',
    stage: normalizeAiRolloutStage(env.AI_CANARY_ROLLOUT_STAGE),
    wiredIntoAssist: env.AI_CANARY_WIRED_INTO_ASSIST === 'true',
    liveRolloutGatesEnabled: env.AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED === 'true',
    ...(stageSetAt ? { stageSetAt } : {}),
  };
}
