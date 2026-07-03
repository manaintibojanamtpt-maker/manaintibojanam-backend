/**
 * EventSDK — projection runtime telemetry (M6 PR-6).
 */

export type ProjectionRuntimeTelemetryEventType =
  | 'projection_runtime_started'
  | 'projection_runtime_completed'
  | 'projection_runtime_failed'
  | 'projection_snapshot_saved'
  | 'projection_execution_recorded'
  | 'projection_statistics_updated';

export interface ProjectionRuntimeTelemetryEvent {
  readonly type: ProjectionRuntimeTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly consumerGroup?: string;
  readonly executionId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type ProjectionRuntimeTelemetryHook = (event: ProjectionRuntimeTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createProjectionRuntimeTelemetryEmitter = (
  hook: ProjectionRuntimeTelemetryHook | undefined,
  method: string,
  projectionName?: string,
  consumerGroup?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: ProjectionRuntimeTelemetryEvent) => hook?.(event);

  return {
    runtimeStarted: (executionId?: string) =>
      emit({
        type: 'projection_runtime_started',
        method,
        projectionName,
        consumerGroup,
        executionId,
      }),
    runtimeCompleted: (executionId?: string, processed?: number) =>
      emit({
        type: 'projection_runtime_completed',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
        errorCode: processed !== undefined ? String(processed) : undefined,
      }),
    runtimeFailed: (errorCode: string, executionId?: string) =>
      emit({
        type: 'projection_runtime_failed',
        method,
        projectionName,
        consumerGroup,
        executionId,
        errorCode,
        durationMs: elapsed(),
      }),
    snapshotSaved: (executionId?: string) =>
      emit({
        type: 'projection_snapshot_saved',
        method,
        projectionName,
        consumerGroup,
        executionId,
      }),
    executionRecorded: (executionId?: string) =>
      emit({
        type: 'projection_execution_recorded',
        method,
        projectionName,
        consumerGroup,
        executionId,
      }),
    statisticsUpdated: (executionId?: string) =>
      emit({
        type: 'projection_statistics_updated',
        method,
        projectionName,
        consumerGroup,
        executionId,
      }),
  };
};
