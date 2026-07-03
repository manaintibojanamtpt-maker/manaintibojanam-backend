/**
 * Pricing projection rollout telemetry (M8 PR-12).
 */

import type { RolloutStageId } from '../../../domain/pricing/rollout/RolloutStage';

export type PricingProjectionRolloutTelemetryEventType =
  | 'pricing_projection_rollout_started'
  | 'pricing_projection_rollout_completed'
  | 'pricing_projection_rollout_stage_changed'
  | 'pricing_projection_rollout_promoted'
  | 'pricing_projection_rollout_blocked'
  | 'pricing_projection_rollout_fallback';

export interface PricingProjectionRolloutTelemetryEvent {
  readonly type: PricingProjectionRolloutTelemetryEventType;
  readonly method: string;
  readonly stage?: RolloutStageId;
  readonly toStage?: RolloutStageId;
  readonly reason?: string;
  readonly durationMs?: number;
}

export type PricingProjectionRolloutTelemetryHook = (
  event: PricingProjectionRolloutTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingProjectionRolloutTelemetryEmitter = (
  hook: PricingProjectionRolloutTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingProjectionRolloutTelemetryEvent) => hook?.(event);

  return {
    rolloutStarted: () => emit({ type: 'pricing_projection_rollout_started', method }),
    rolloutCompleted: () =>
      emit({ type: 'pricing_projection_rollout_completed', method, durationMs: elapsed() }),
    stageChanged: (stage: RolloutStageId, toStage: RolloutStageId, reason?: string) =>
      emit({
        type: 'pricing_projection_rollout_stage_changed',
        method,
        stage,
        toStage,
        reason,
        durationMs: elapsed(),
      }),
    rolloutFallback: (reason: string, stage?: RolloutStageId) =>
      emit({
        type: 'pricing_projection_rollout_fallback',
        method,
        stage,
        reason,
        durationMs: elapsed(),
      }),
    rolloutPromoted: (stage: RolloutStageId, toStage: RolloutStageId) =>
      emit({
        type: 'pricing_projection_rollout_promoted',
        method,
        stage,
        toStage,
        durationMs: elapsed(),
      }),
    rolloutBlocked: (reason: string, stage?: RolloutStageId) =>
      emit({
        type: 'pricing_projection_rollout_blocked',
        method,
        stage,
        reason,
        durationMs: elapsed(),
      }),
  };
};
