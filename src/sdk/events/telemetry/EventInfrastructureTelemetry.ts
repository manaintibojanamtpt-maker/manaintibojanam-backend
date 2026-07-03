/**
 * EventSDK — infrastructure telemetry (M6 PR-2).
 * Infrastructure-only — no analytics.
 */

export type EventInfrastructureTelemetryEventType =
  | 'publish_started'
  | 'publish_completed'
  | 'publish_failed'
  | 'outbox_append'
  | 'replay_started'
  | 'replay_completed'
  | 'subscriber_matched'
  | 'subscriber_failed';

export interface EventInfrastructureTelemetryEvent {
  readonly type: EventInfrastructureTelemetryEventType;
  readonly method: string;
  readonly eventId?: string;
  readonly eventType?: string;
  readonly consumerGroup?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type EventInfrastructureTelemetryHook = (
  event: EventInfrastructureTelemetryEvent
) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createEventInfrastructureTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

const emit = (
  hook: EventInfrastructureTelemetryHook | undefined,
  event: EventInfrastructureTelemetryEvent
): void => {
  hook?.(event);
};

export const createEventInfrastructureTelemetryEmitter = (
  hook: EventInfrastructureTelemetryHook | undefined,
  method: string,
  correlationId?: string
) => {
  const totalTimer = createEventInfrastructureTimer();

  return {
    publishStarted: (eventType?: string, eventId?: string) =>
      emit(hook, {
        type: 'publish_started',
        method,
        eventType,
        eventId,
        correlationId,
      }),

    publishCompleted: (eventId?: string, eventType?: string) =>
      emit(hook, {
        type: 'publish_completed',
        method,
        eventId,
        eventType,
        correlationId,
        durationMs: totalTimer(),
      }),

    publishFailed: (errorCode: string, eventType?: string) =>
      emit(hook, {
        type: 'publish_failed',
        method,
        eventType,
        correlationId,
        errorCode,
        durationMs: totalTimer(),
      }),

    outboxAppend: (eventId?: string, eventType?: string) =>
      emit(hook, { type: 'outbox_append', method, eventId, eventType, correlationId }),

    replayStarted: (consumerGroup?: string) =>
      emit(hook, { type: 'replay_started', method, consumerGroup, correlationId }),

    replayCompleted: (consumerGroup?: string, eventCount?: number) =>
      emit(hook, {
        type: 'replay_completed',
        method,
        consumerGroup,
        correlationId,
        durationMs: totalTimer(),
        errorCode: eventCount !== undefined ? String(eventCount) : undefined,
      }),

    subscriberMatched: (consumerGroup?: string, eventType?: string) =>
      emit(hook, {
        type: 'subscriber_matched',
        method,
        consumerGroup,
        eventType,
        correlationId,
      }),

    subscriberFailed: (errorCode: string, consumerGroup?: string) =>
      emit(hook, {
        type: 'subscriber_failed',
        method,
        consumerGroup,
        correlationId,
        errorCode,
      }),
  };
};
