import {
  buildAiAuditEvent,
  type AiAuditEvent,
} from './auditContracts.js';
import { schedulePersistAiAuditEvent } from './aiAuditPersistence.js';
import { maybeCaptureAiShadowSample } from './shadow/captureAiShadowSample.js';
import {
  buildAiObservabilitySnapshot,
  type AiMetricSample,
  type AiObservabilitySnapshot,
} from './aiObservabilityContracts.js';

const DEFAULT_CAPACITY = 1000;

type LoggerLike = {
  info: (payload: Record<string, unknown>) => void;
  warn: (payload: Record<string, unknown>) => void;
  error: (payload: Record<string, unknown>) => void;
};

export class AiMetricsCollector {
  private readonly samples: AiMetricSample[] = [];
  private readonly capacity: number;

  constructor(capacity = DEFAULT_CAPACITY) {
    this.capacity = Math.max(1, capacity);
  }

  record(event: AiAuditEvent): void {
    this.samples.push({
      timestampMs: Date.parse(event.timestamp) || Date.now(),
      eventType: event.eventType,
      success: event.success,
      safetyBlocked: event.safetyBlocked === true,
      ...(typeof event.latencyMs === 'number' ? { latencyMs: event.latencyMs } : {}),
      ...(event.platform ? { platform: event.platform } : {}),
      ...(event.mode ? { mode: event.mode } : {}),
      ...(typeof event.canaryBucket === 'number' ? { canaryBucket: event.canaryBucket } : {}),
      ...(event.errorCode ? { errorCode: event.errorCode } : {}),
      ...(typeof event.canaryGateApplied === 'boolean'
        ? { canaryGateApplied: event.canaryGateApplied }
        : {}),
    });
    while (this.samples.length > this.capacity) {
      this.samples.shift();
    }
  }

  snapshot(nowMs: number = Date.now()): AiObservabilitySnapshot {
    return buildAiObservabilitySnapshot(this.samples, nowMs);
  }

  /** Test helper */
  reset(): void {
    this.samples.length = 0;
  }

  /** Test helper */
  size(): number {
    return this.samples.length;
  }
}

let singleton: AiMetricsCollector | null = null;

export function getAiMetricsCollector(): AiMetricsCollector {
  if (!singleton) singleton = new AiMetricsCollector();
  return singleton;
}

export function resetAiMetricsCollectorForTests(): void {
  singleton = null;
}

/**
 * Build audit event, record metrics, log, and (when flagged) fire-and-forget persist.
 * Single emit path for gateway + cart-plan decision routes.
 */
export function emitAiAuditEvent(
  log: LoggerLike | undefined,
  level: 'info' | 'warn' | 'error',
  partial: Parameters<typeof buildAiAuditEvent>[0],
): AiAuditEvent {
  const event = buildAiAuditEvent(partial);
  getAiMetricsCollector().record(event);
  log?.[level](event as unknown as Record<string, unknown>);
  schedulePersistAiAuditEvent(event);
  maybeCaptureAiShadowSample(event);
  return event;
}

export function getAiObservabilitySnapshot(nowMs?: number): AiObservabilitySnapshot {
  return getAiMetricsCollector().snapshot(nowMs);
}
