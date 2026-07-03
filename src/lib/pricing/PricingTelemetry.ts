/**
 * M8 PR-5 — Pricing facade telemetry.
 */

import type { PricingSessionStatus } from './PricingContext';

export type PricingFacadeTelemetryEventType =
  | 'pricing_facade_request'
  | 'pricing_facade_success'
  | 'pricing_facade_failure'
  | 'pricing_facade_retry'
  | 'pricing_facade_reset';

export interface PricingFacadeTelemetryEvent {
  readonly type: PricingFacadeTelemetryEventType;
  readonly method: string;
  readonly tenantId?: string;
  readonly status?: PricingSessionStatus;
  readonly errorCode?: string;
  readonly durationMs?: number;
}

export type PricingFacadeTelemetryHook = (event: PricingFacadeTelemetryEvent) => void;

let globalHook: PricingFacadeTelemetryHook | undefined;

export const setPricingFacadeTelemetryHook = (
  hook: PricingFacadeTelemetryHook | undefined
): void => {
  globalHook = hook;
};

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingFacadeTelemetryEmitter = (
  hook: PricingFacadeTelemetryHook | undefined,
  method: string
) => {
  const resolvedHook = hook ?? globalHook;
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingFacadeTelemetryEvent) => resolvedHook?.(event);

  return {
    request: (tenantId?: string) =>
      emit({ type: 'pricing_facade_request', method, tenantId }),
    success: (tenantId?: string, status?: PricingSessionStatus) =>
      emit({
        type: 'pricing_facade_success',
        method,
        tenantId,
        status,
        durationMs: elapsed(),
      }),
    failure: (errorCode: string, tenantId?: string) =>
      emit({
        type: 'pricing_facade_failure',
        method,
        tenantId,
        errorCode,
        durationMs: elapsed(),
      }),
    retry: (tenantId?: string) =>
      emit({ type: 'pricing_facade_retry', method, tenantId, durationMs: elapsed() }),
    reset: () => emit({ type: 'pricing_facade_reset', method, durationMs: elapsed() }),
  };
};
