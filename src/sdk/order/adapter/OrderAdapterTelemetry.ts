/**
 * Order adapter telemetry (M6 PR-11).
 */

import type { OrderReadSource } from '../../../domain/order/adapter/OrderReadSource';

export type OrderAdapterTelemetryEventType =
  | 'order_adapter_started'
  | 'order_adapter_completed'
  | 'order_adapter_failed'
  | 'order_adapter_fallback'
  | 'order_adapter_projection_selected'
  | 'order_adapter_legacy_selected';

export interface OrderAdapterTelemetryEvent {
  readonly type: OrderAdapterTelemetryEventType;
  readonly method: string;
  readonly orderId?: string;
  readonly source?: OrderReadSource;
  readonly reason?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type OrderAdapterTelemetryHook = (event: OrderAdapterTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createOrderAdapterTelemetryEmitter = (
  hook: OrderAdapterTelemetryHook | undefined,
  method: string,
  orderId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: OrderAdapterTelemetryEvent) => hook?.(event);

  return {
    adapterStarted: () => emit({ type: 'order_adapter_started', method, orderId }),
    adapterCompleted: (source?: OrderReadSource) =>
      emit({
        type: 'order_adapter_completed',
        method,
        orderId,
        source,
        durationMs: elapsed(),
      }),
    adapterFailed: (errorCode: string, source?: OrderReadSource) =>
      emit({
        type: 'order_adapter_failed',
        method,
        orderId,
        source,
        errorCode,
        durationMs: elapsed(),
      }),
    adapterFallback: (reason: string) =>
      emit({ type: 'order_adapter_fallback', method, orderId, reason, durationMs: elapsed() }),
    projectionSelected: () =>
      emit({ type: 'order_adapter_projection_selected', method, orderId, source: 'projection' }),
    legacySelected: (reason?: string) =>
      emit({
        type: 'order_adapter_legacy_selected',
        method,
        orderId,
        source: 'legacy',
        reason,
      }),
  };
};
