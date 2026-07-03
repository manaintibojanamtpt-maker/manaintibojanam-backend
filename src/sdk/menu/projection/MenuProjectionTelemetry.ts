/**
 * Menu projection telemetry (M7 PR-6).
 */

export type MenuProjectionTelemetryEventType =
  | 'menu_projection_started'
  | 'menu_projection_completed'
  | 'menu_projection_failed'
  | 'menu_projection_checkpoint_saved'
  | 'menu_projection_snapshot_saved';

export interface MenuProjectionTelemetryEvent {
  readonly type: MenuProjectionTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly consumerGroup?: string;
  readonly executionId?: string;
  readonly errorCode?: string;
  readonly durationMs?: number;
}

export type MenuProjectionTelemetryHook = (event: MenuProjectionTelemetryEvent) => void;

let globalHook: MenuProjectionTelemetryHook | undefined;

export const setMenuProjectionTelemetryHook = (
  hook: MenuProjectionTelemetryHook | undefined
): void => {
  globalHook = hook;
};

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuProjectionTelemetryEmitter = (
  hook: MenuProjectionTelemetryHook | undefined,
  method: string,
  projectionName?: string,
  consumerGroup?: string
) => {
  const resolvedHook = hook ?? globalHook;
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuProjectionTelemetryEvent) => resolvedHook?.(event);

  return {
    started: (executionId: string) =>
      emit({
        type: 'menu_projection_started',
        method,
        projectionName,
        consumerGroup,
        executionId,
      }),
    completed: (executionId: string) =>
      emit({
        type: 'menu_projection_completed',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
      }),
    failed: (errorCode: string, executionId?: string) =>
      emit({
        type: 'menu_projection_failed',
        method,
        projectionName,
        consumerGroup,
        executionId,
        errorCode,
        durationMs: elapsed(),
      }),
    checkpointSaved: (executionId?: string) =>
      emit({
        type: 'menu_projection_checkpoint_saved',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
      }),
    snapshotSaved: (executionId?: string) =>
      emit({
        type: 'menu_projection_snapshot_saved',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
      }),
  };
};
