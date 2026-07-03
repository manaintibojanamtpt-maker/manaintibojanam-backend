/**
 * Pricing catalog shadow projection telemetry (M8 PR-7).
 */

export type PricingCatalogProjectionTelemetryEventType =
  | 'pricing_projection_started'
  | 'pricing_projection_processed'
  | 'pricing_projection_completed'
  | 'pricing_projection_failed'
  | 'pricing_projection_snapshot_saved';

export interface PricingCatalogProjectionTelemetryEvent {
  readonly type: PricingCatalogProjectionTelemetryEventType;
  readonly method: string;
  readonly priceListId?: string;
  readonly eventType?: string;
  readonly eventId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type PricingCatalogProjectionTelemetryHook = (
  event: PricingCatalogProjectionTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingCatalogProjectionTelemetryEmitter = (
  hook: PricingCatalogProjectionTelemetryHook | undefined,
  method: string,
  priceListId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingCatalogProjectionTelemetryEvent) => hook?.(event);

  return {
    projectionStarted: (eventType?: string, eventId?: string) =>
      emit({ type: 'pricing_projection_started', method, priceListId, eventType, eventId }),
    projectionProcessed: (eventType?: string, eventId?: string) =>
      emit({ type: 'pricing_projection_processed', method, priceListId, eventType, eventId }),
    projectionCompleted: (eventType?: string, eventId?: string) =>
      emit({
        type: 'pricing_projection_completed',
        method,
        priceListId,
        eventType,
        eventId,
        durationMs: elapsed(),
      }),
    projectionFailed: (errorCode: string, eventType?: string, eventId?: string) =>
      emit({
        type: 'pricing_projection_failed',
        method,
        priceListId,
        eventType,
        eventId,
        errorCode,
        durationMs: elapsed(),
      }),
    snapshotSaved: (eventId?: string) =>
      emit({ type: 'pricing_projection_snapshot_saved', method, priceListId, eventId }),
  };
};
