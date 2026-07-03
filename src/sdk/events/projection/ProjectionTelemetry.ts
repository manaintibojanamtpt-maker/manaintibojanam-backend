/**
 * EventSDK — projection telemetry (M6 PR-4).
 * Superset of ProjectionWorkerTelemetry with rebuild + lease_renewed events.
 */

export type ProjectionTelemetryEventType =
  | 'projection_started'
  | 'projection_completed'
  | 'projection_failed'
  | 'checkpoint_saved'
  | 'checkpoint_loaded'
  | 'handler_invoked'
  | 'handler_failed'
  | 'lease_acquired'
  | 'lease_renewed'
  | 'lease_released'
  | 'rebuild_started'
  | 'rebuild_completed';

export interface ProjectionTelemetryEvent {
  readonly type: ProjectionTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly consumerGroup?: string;
  readonly eventId?: string;
  readonly eventType?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type ProjectionTelemetryHook = (event: ProjectionTelemetryEvent) => void;

/** Backward-compatible aliases */
export type ProjectionWorkerTelemetryEventType = ProjectionTelemetryEventType;
export type ProjectionWorkerTelemetryEvent = ProjectionTelemetryEvent;
export type ProjectionWorkerTelemetryHook = ProjectionTelemetryHook;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createProjectionTelemetryEmitter = (
  hook: ProjectionTelemetryHook | undefined,
  method: string,
  projectionName?: string,
  consumerGroup?: string
) => {
  const start = pipelineNow();
  const elapsed = () => Math.max(0, Math.round(pipelineNow() - start));
  const emit = (event: ProjectionTelemetryEvent) => hook?.(event);

  return {
    projectionStarted: (eventId?: string, eventType?: string) =>
      emit({ type: 'projection_started', method, projectionName, consumerGroup, eventId, eventType }),
    projectionCompleted: (eventId?: string, processed?: number) =>
      emit({
        type: 'projection_completed',
        method,
        projectionName,
        consumerGroup,
        eventId,
        durationMs: elapsed(),
        errorCode: processed !== undefined ? String(processed) : undefined,
      }),
    projectionFailed: (errorCode: string, eventId?: string) =>
      emit({
        type: 'projection_failed',
        method,
        projectionName,
        consumerGroup,
        eventId,
        errorCode,
        durationMs: elapsed(),
      }),
    checkpointSaved: () =>
      emit({ type: 'checkpoint_saved', method, projectionName, consumerGroup }),
    checkpointLoaded: () =>
      emit({ type: 'checkpoint_loaded', method, projectionName, consumerGroup }),
    handlerInvoked: (eventType?: string, eventId?: string) =>
      emit({ type: 'handler_invoked', method, projectionName, consumerGroup, eventType, eventId }),
    handlerFailed: (errorCode: string, eventType?: string) =>
      emit({ type: 'handler_failed', method, projectionName, consumerGroup, eventType, errorCode }),
    leaseAcquired: () =>
      emit({ type: 'lease_acquired', method, projectionName, consumerGroup }),
    leaseRenewed: () =>
      emit({ type: 'lease_renewed', method, projectionName, consumerGroup }),
    leaseReleased: () =>
      emit({ type: 'lease_released', method, projectionName, consumerGroup }),
    rebuildStarted: (rebuildId?: string) =>
      emit({
        type: 'rebuild_started',
        method,
        projectionName,
        consumerGroup,
        eventId: rebuildId,
      }),
    rebuildCompleted: (rebuildId?: string, processed?: number) =>
      emit({
        type: 'rebuild_completed',
        method,
        projectionName,
        consumerGroup,
        eventId: rebuildId,
        errorCode: processed !== undefined ? String(processed) : undefined,
        durationMs: elapsed(),
      }),
  };
};

/** Backward-compatible alias */
export const createProjectionWorkerTelemetryEmitter = createProjectionTelemetryEmitter;
