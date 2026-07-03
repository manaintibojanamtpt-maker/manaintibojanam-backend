/**
 * PricingSDK — orchestration telemetry (M8 PR-4).
 */

export type PricingTelemetryEventType =
  | 'pricing_request'
  | 'pricing_success'
  | 'pricing_failure'
  | 'repository_read'
  | 'validation_completed';

export interface PricingTelemetryTimingMs {
  readonly validationMs?: number;
  readonly repositoryMs?: number;
  readonly domainMs?: number;
  readonly totalMs?: number;
}

export interface PricingTelemetryEvent {
  readonly type: PricingTelemetryEventType;
  readonly method: string;
  readonly tenantId?: string;
  readonly itemId?: string;
  readonly timingMs?: PricingTelemetryTimingMs;
  readonly errorCode?: string;
}

export type PricingTelemetryHook = (event: PricingTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingPipelineTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const createPricingTelemetryEmitter = (
  hook: PricingTelemetryHook | undefined,
  method: string
) => {
  const totalTimer = createPricingPipelineTimer();

  const emit = (event: PricingTelemetryEvent) => hook?.(event);

  return {
    request: (context?: { tenantId?: string; itemId?: string }) => {
      emit({
        type: 'pricing_request',
        method,
        tenantId: context?.tenantId,
        itemId: context?.itemId,
      });
    },
    repositoryRead: (context?: { tenantId?: string }) => {
      emit({ type: 'repository_read', method, tenantId: context?.tenantId });
    },
    validationCompleted: (timingMs?: PricingTelemetryTimingMs) => {
      emit({ type: 'validation_completed', method, timingMs });
    },
    success: (timingMs?: PricingTelemetryTimingMs, context?: { tenantId?: string }) => {
      emit({
        type: 'pricing_success',
        method,
        tenantId: context?.tenantId,
        timingMs: { ...timingMs, totalMs: totalTimer() },
      });
    },
    failure: (errorCode: string, context?: { tenantId?: string }) => {
      emit({
        type: 'pricing_failure',
        method,
        tenantId: context?.tenantId,
        errorCode,
        timingMs: { totalMs: totalTimer() },
      });
    },
  };
};
