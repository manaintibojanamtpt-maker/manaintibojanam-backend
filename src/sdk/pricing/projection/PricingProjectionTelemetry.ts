/**
 * Pricing projection telemetry (M8 PR-6).
 */

export type PricingProjectionTelemetryEventType =
  | 'pricing_projection_started'
  | 'pricing_projection_completed'
  | 'pricing_projection_failed'
  | 'pricing_projection_checkpoint_saved'
  | 'pricing_projection_snapshot_saved';

export interface PricingProjectionTelemetryEvent {
  readonly type: PricingProjectionTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly consumerGroup?: string;
  readonly executionId?: string;
  readonly errorCode?: string;
  readonly durationMs?: number;
}

export type PricingProjectionTelemetryHook = (event: PricingProjectionTelemetryEvent) => void;

let globalHook: PricingProjectionTelemetryHook | undefined;

export const setPricingProjectionTelemetryHook = (
  hook: PricingProjectionTelemetryHook | undefined
): void => {
  globalHook = hook;
};

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingProjectionTelemetryEmitter = (
  hook: PricingProjectionTelemetryHook | undefined,
  method: string,
  projectionName?: string,
  consumerGroup?: string
) => {
  const resolvedHook = hook ?? globalHook;
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingProjectionTelemetryEvent) => resolvedHook?.(event);

  return {
    started: (executionId: string) =>
      emit({
        type: 'pricing_projection_started',
        method,
        projectionName,
        consumerGroup,
        executionId,
      }),
    completed: (executionId: string) =>
      emit({
        type: 'pricing_projection_completed',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
      }),
    failed: (errorCode: string, executionId?: string) =>
      emit({
        type: 'pricing_projection_failed',
        method,
        projectionName,
        consumerGroup,
        executionId,
        errorCode,
        durationMs: elapsed(),
      }),
    checkpointSaved: (executionId?: string) =>
      emit({
        type: 'pricing_projection_checkpoint_saved',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
      }),
    snapshotSaved: (executionId?: string) =>
      emit({
        type: 'pricing_projection_snapshot_saved',
        method,
        projectionName,
        consumerGroup,
        executionId,
        durationMs: elapsed(),
      }),
  };
};
