/**
 * Menu projection rollout telemetry (M7 PR-12).
 */

import type { RolloutStageId } from '../../../domain/menu/rollout/RolloutStage';

export type MenuProjectionRolloutTelemetryEventType =
  | 'menu_projection_rollout_started'
  | 'menu_projection_rollout_completed'
  | 'menu_projection_rollout_stage_changed'
  | 'menu_projection_rollout_promoted'
  | 'menu_projection_rollout_blocked'
  | 'menu_projection_rollout_fallback';

export interface MenuProjectionRolloutTelemetryEvent {
  readonly type: MenuProjectionRolloutTelemetryEventType;
  readonly method: string;
  readonly stage?: RolloutStageId;
  readonly toStage?: RolloutStageId;
  readonly reason?: string;
  readonly durationMs?: number;
}

export type MenuProjectionRolloutTelemetryHook = (
  event: MenuProjectionRolloutTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuProjectionRolloutTelemetryEmitter = (
  hook: MenuProjectionRolloutTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuProjectionRolloutTelemetryEvent) => hook?.(event);

  return {
    rolloutStarted: () => emit({ type: 'menu_projection_rollout_started', method }),
    rolloutCompleted: () =>
      emit({ type: 'menu_projection_rollout_completed', method, durationMs: elapsed() }),
    stageChanged: (stage: RolloutStageId, toStage: RolloutStageId, reason?: string) =>
      emit({
        type: 'menu_projection_rollout_stage_changed',
        method,
        stage,
        toStage,
        reason,
        durationMs: elapsed(),
      }),
    rolloutFallback: (reason: string, stage?: RolloutStageId) =>
      emit({
        type: 'menu_projection_rollout_fallback',
        method,
        stage,
        reason,
        durationMs: elapsed(),
      }),
    rolloutPromoted: (stage: RolloutStageId, toStage: RolloutStageId) =>
      emit({
        type: 'menu_projection_rollout_promoted',
        method,
        stage,
        toStage,
        durationMs: elapsed(),
      }),
    rolloutBlocked: (reason: string, stage?: RolloutStageId) =>
      emit({
        type: 'menu_projection_rollout_blocked',
        method,
        stage,
        reason,
        durationMs: elapsed(),
      }),
  };
};
