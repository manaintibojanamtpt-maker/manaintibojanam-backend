/**
 * Projection rollout telemetry (M6 PR-12).
 */

import type { RolloutStageId } from '../../../domain/order/rollout/RolloutStage';

export type ProjectionRolloutTelemetryEventType =
  | 'projection_rollout_started'
  | 'projection_rollout_completed'
  | 'projection_rollout_stage_changed'
  | 'projection_rollout_fallback'
  | 'projection_rollout_promoted'
  | 'projection_rollout_blocked';

export interface ProjectionRolloutTelemetryEvent {
  readonly type: ProjectionRolloutTelemetryEventType;
  readonly method: string;
  readonly stage?: RolloutStageId;
  readonly toStage?: RolloutStageId;
  readonly reason?: string;
  readonly durationMs?: number;
}

export type ProjectionRolloutTelemetryHook = (event: ProjectionRolloutTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createProjectionRolloutTelemetryEmitter = (
  hook: ProjectionRolloutTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: ProjectionRolloutTelemetryEvent) => hook?.(event);

  return {
    rolloutStarted: () => emit({ type: 'projection_rollout_started', method }),
    rolloutCompleted: () =>
      emit({ type: 'projection_rollout_completed', method, durationMs: elapsed() }),
    stageChanged: (stage: RolloutStageId, toStage: RolloutStageId, reason?: string) =>
      emit({
        type: 'projection_rollout_stage_changed',
        method,
        stage,
        toStage,
        reason,
        durationMs: elapsed(),
      }),
    rolloutFallback: (reason: string, stage?: RolloutStageId) =>
      emit({ type: 'projection_rollout_fallback', method, stage, reason, durationMs: elapsed() }),
    rolloutPromoted: (stage: RolloutStageId, toStage: RolloutStageId) =>
      emit({
        type: 'projection_rollout_promoted',
        method,
        stage,
        toStage,
        durationMs: elapsed(),
      }),
    rolloutBlocked: (reason: string, stage?: RolloutStageId) =>
      emit({ type: 'projection_rollout_blocked', method, stage, reason, durationMs: elapsed() }),
  };
};
