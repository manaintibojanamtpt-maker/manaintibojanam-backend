/**
 * Order business event telemetry (M6 PR-5).
 */

export type OrderEventTelemetryEventType =
  | 'order_shadow_publish_started'
  | 'order_shadow_publish_completed'
  | 'order_shadow_publish_failed'
  | 'order_event_validated'
  | 'order_event_mapped';

export interface OrderEventTelemetryEvent {
  readonly type: OrderEventTelemetryEventType;
  readonly method: string;
  readonly eventType?: string;
  readonly orderId?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type OrderEventTelemetryHook = (event: OrderEventTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createOrderEventTelemetryEmitter = (
  hook: OrderEventTelemetryHook | undefined,
  method: string,
  orderId?: string,
  correlationId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: OrderEventTelemetryEvent) => hook?.(event);

  return {
    shadowPublishStarted: (eventType?: string) =>
      emit({
        type: 'order_shadow_publish_started',
        method,
        eventType,
        orderId,
        correlationId,
      }),
    shadowPublishCompleted: (eventType?: string, eventId?: string) =>
      emit({
        type: 'order_shadow_publish_completed',
        method,
        eventType,
        orderId,
        correlationId,
        errorCode: eventId,
        durationMs: elapsed(),
      }),
    shadowPublishFailed: (errorCode: string, eventType?: string) =>
      emit({
        type: 'order_shadow_publish_failed',
        method,
        eventType,
        orderId,
        correlationId,
        errorCode,
        durationMs: elapsed(),
      }),
    eventValidated: (eventType?: string) =>
      emit({ type: 'order_event_validated', method, eventType, orderId, correlationId }),
    eventMapped: (eventType?: string) =>
      emit({ type: 'order_event_mapped', method, eventType, orderId, correlationId }),
  };
};
