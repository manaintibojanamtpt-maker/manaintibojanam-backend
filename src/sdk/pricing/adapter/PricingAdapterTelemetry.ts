/**
 * Pricing adapter telemetry (M8 PR-11).
 */

import type { PricingReadSource } from '../../../domain/pricing/adapter/PricingReadSource';

export type PricingAdapterTelemetryEventType =
  | 'pricing_adapter_started'
  | 'pricing_adapter_completed'
  | 'pricing_adapter_failed'
  | 'pricing_adapter_fallback'
  | 'pricing_adapter_projection_selected'
  | 'pricing_adapter_legacy_selected';

export interface PricingAdapterTelemetryEvent {
  readonly type: PricingAdapterTelemetryEventType;
  readonly method: string;
  readonly priceListId?: string;
  readonly source?: PricingReadSource;
  readonly reason?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type PricingAdapterTelemetryHook = (event: PricingAdapterTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingAdapterTelemetryEmitter = (
  hook: PricingAdapterTelemetryHook | undefined,
  method: string,
  priceListId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingAdapterTelemetryEvent) => hook?.(event);

  return {
    adapterStarted: () => emit({ type: 'pricing_adapter_started', method, priceListId }),
    adapterCompleted: (source?: PricingReadSource) =>
      emit({
        type: 'pricing_adapter_completed',
        method,
        priceListId,
        source,
        durationMs: elapsed(),
      }),
    adapterFailed: (errorCode: string, source?: PricingReadSource) =>
      emit({
        type: 'pricing_adapter_failed',
        method,
        priceListId,
        source,
        errorCode,
        durationMs: elapsed(),
      }),
    adapterFallback: (reason: string) =>
      emit({ type: 'pricing_adapter_fallback', method, priceListId, reason, durationMs: elapsed() }),
    projectionSelected: () =>
      emit({
        type: 'pricing_adapter_projection_selected',
        method,
        priceListId,
        source: 'projection',
      }),
    legacySelected: (reason?: string) =>
      emit({
        type: 'pricing_adapter_legacy_selected',
        method,
        priceListId,
        source: 'legacy',
        reason,
      }),
  };
};
