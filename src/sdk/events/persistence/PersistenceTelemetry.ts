/**
 * EventSDK — persistence telemetry (M6 PR-3).
 * Infrastructure-only — no analytics.
 */

export type EventPersistenceTelemetryEventType =
  | 'persist_started'
  | 'persist_completed'
  | 'persist_failed'
  | 'shadow_publish'
  | 'outbox_written';

export interface EventPersistenceTelemetryEvent {
  readonly type: EventPersistenceTelemetryEventType;
  readonly method: string;
  readonly collection?: string;
  readonly documentId?: string;
  readonly eventId?: string;
  readonly eventType?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type EventPersistenceTelemetryHook = (event: EventPersistenceTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPersistenceTelemetryEmitter = (
  hook: EventPersistenceTelemetryHook | undefined,
  method: string,
  correlationId?: string
) => {
  const timer = (): number => {
    const start = pipelineNow();
    return () => Math.max(0, Math.round(pipelineNow() - start));
  };

  return {
    persistStarted: (collection?: string, documentId?: string) => {
      hook?.({ type: 'persist_started', method, collection, documentId, correlationId });
    },
    persistCompleted: (collection?: string, documentId?: string, elapsed?: () => number) => {
      hook?.({
        type: 'persist_completed',
        method,
        collection,
        documentId,
        correlationId,
        durationMs: elapsed?.(),
      });
    },
    persistFailed: (errorCode: string, collection?: string) => {
      hook?.({ type: 'persist_failed', method, collection, correlationId, errorCode });
    },
    shadowPublish: (eventId?: string, eventType?: string) => {
      hook?.({ type: 'shadow_publish', method, eventId, eventType, correlationId });
    },
    outboxWritten: (eventId?: string, eventType?: string, documentId?: string) => {
      hook?.({ type: 'outbox_written', method, eventId, eventType, documentId, correlationId });
    },
    persistFailed: (errorCode: string, collection?: string) => {
      hook?.({ type: 'persist_failed', method, collection, correlationId, errorCode });
    },
  };
};
