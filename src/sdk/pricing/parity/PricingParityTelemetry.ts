/**
 * Pricing parity telemetry (M8 PR-8).
 */

import type { PricingParityOutcome } from '../../../domain/pricing/parity/PricingParityResult';

export type PricingParityTelemetryEventType =
  | 'pricing_parity_started'
  | 'pricing_parity_completed'
  | 'pricing_parity_failed'
  | 'pricing_parity_match'
  | 'pricing_parity_mismatch';

export interface PricingParityTelemetryEvent {
  readonly type: PricingParityTelemetryEventType;
  readonly method: string;
  readonly priceListId?: string;
  readonly outcome?: PricingParityOutcome;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type PricingParityTelemetryHook = (event: PricingParityTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingParityTelemetryEmitter = (
  hook: PricingParityTelemetryHook | undefined,
  method: string,
  priceListId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingParityTelemetryEvent) => hook?.(event);

  return {
    parityStarted: () => emit({ type: 'pricing_parity_started', method, priceListId }),
    parityCompleted: (outcome?: PricingParityOutcome) =>
      emit({
        type: 'pricing_parity_completed',
        method,
        priceListId,
        outcome,
        durationMs: elapsed(),
      }),
    parityFailed: (errorCode: string) =>
      emit({
        type: 'pricing_parity_failed',
        method,
        priceListId,
        errorCode,
        durationMs: elapsed(),
      }),
    parityMatch: (outcome: PricingParityOutcome) =>
      emit({ type: 'pricing_parity_match', method, priceListId, outcome, durationMs: elapsed() }),
    parityMismatch: (outcome: PricingParityOutcome) =>
      emit({
        type: 'pricing_parity_mismatch',
        method,
        priceListId,
        outcome,
        durationMs: elapsed(),
      }),
  };
};
