/**
 * Order parity telemetry (M6 PR-8).
 */

import type { OrderParityOutcome } from '../../../../domain/events/parity/order/OrderParityResult';

export type OrderParityTelemetryEventType =
  | 'order_parity_started'
  | 'order_parity_completed'
  | 'order_parity_failed'
  | 'order_parity_match'
  | 'order_parity_mismatch';

export interface OrderParityTelemetryEvent {
  readonly type: OrderParityTelemetryEventType;
  readonly method: string;
  readonly orderId?: string;
  readonly outcome?: OrderParityOutcome;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type OrderParityTelemetryHook = (event: OrderParityTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createOrderParityTelemetryEmitter = (
  hook: OrderParityTelemetryHook | undefined,
  method: string,
  orderId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: OrderParityTelemetryEvent) => hook?.(event);

  return {
    parityStarted: () =>
      emit({ type: 'order_parity_started', method, orderId }),
    parityCompleted: (outcome?: OrderParityOutcome) =>
      emit({
        type: 'order_parity_completed',
        method,
        orderId,
        outcome,
        durationMs: elapsed(),
      }),
    parityFailed: (errorCode: string) =>
      emit({
        type: 'order_parity_failed',
        method,
        orderId,
        errorCode,
        durationMs: elapsed(),
      }),
    parityMatch: (outcome: OrderParityOutcome) =>
      emit({ type: 'order_parity_match', method, orderId, outcome, durationMs: elapsed() }),
    parityMismatch: (outcome: OrderParityOutcome) =>
      emit({ type: 'order_parity_mismatch', method, orderId, outcome, durationMs: elapsed() }),
  };
};
