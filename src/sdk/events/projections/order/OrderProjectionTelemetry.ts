/**
 * Order read projection telemetry (M6 PR-7).
 */

export type OrderProjectionTelemetryEventType =
  | 'order_projection_started'
  | 'order_projection_completed'
  | 'order_projection_failed'
  | 'order_projection_snapshot_saved'
  | 'order_projection_event_processed';

export interface OrderProjectionTelemetryEvent {
  readonly type: OrderProjectionTelemetryEventType;
  readonly method: string;
  readonly orderId?: string;
  readonly eventType?: string;
  readonly eventId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type OrderProjectionTelemetryHook = (event: OrderProjectionTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createOrderProjectionTelemetryEmitter = (
  hook: OrderProjectionTelemetryHook | undefined,
  method: string,
  orderId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: OrderProjectionTelemetryEvent) => hook?.(event);

  return {
    projectionStarted: (eventType?: string, eventId?: string) =>
      emit({ type: 'order_projection_started', method, orderId, eventType, eventId }),
    projectionCompleted: (eventType?: string, eventId?: string) =>
      emit({
        type: 'order_projection_completed',
        method,
        orderId,
        eventType,
        eventId,
        durationMs: elapsed(),
      }),
    projectionFailed: (errorCode: string, eventType?: string, eventId?: string) =>
      emit({
        type: 'order_projection_failed',
        method,
        orderId,
        eventType,
        eventId,
        errorCode,
        durationMs: elapsed(),
      }),
    snapshotSaved: (eventId?: string) =>
      emit({ type: 'order_projection_snapshot_saved', method, orderId, eventId }),
    eventProcessed: (eventType?: string, eventId?: string) =>
      emit({ type: 'order_projection_event_processed', method, orderId, eventType, eventId }),
  };
};
