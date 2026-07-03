/**
 * Pricing operational telemetry (M8 PR-10).
 */

import type { PricingProjectionHealthStatus } from '../../../domain/pricing/operations/PricingProjectionHealth';
import type { PricingOperationalReadiness } from '../../../domain/pricing/operations/PricingOperationalRules';

export type PricingOperationalTelemetryEventType =
  | 'pricing_operational_started'
  | 'pricing_operational_completed'
  | 'pricing_operational_failed'
  | 'pricing_projection_lag_detected'
  | 'pricing_projection_drift_detected'
  | 'pricing_projection_replay_verified'
  | 'pricing_projection_health_updated';

export interface PricingOperationalTelemetryEvent {
  readonly type: PricingOperationalTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly health?: PricingProjectionHealthStatus;
  readonly readiness?: PricingOperationalReadiness;
  readonly lagMs?: number;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type PricingOperationalTelemetryHook = (event: PricingOperationalTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingOperationalTelemetryEmitter = (
  hook: PricingOperationalTelemetryHook | undefined,
  method: string,
  projectionName?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingOperationalTelemetryEvent) => hook?.(event);

  return {
    operationalStarted: () =>
      emit({ type: 'pricing_operational_started', method, projectionName }),
    operationalCompleted: (
      health?: PricingProjectionHealthStatus,
      readiness?: PricingOperationalReadiness
    ) =>
      emit({
        type: 'pricing_operational_completed',
        method,
        projectionName,
        health,
        readiness,
        durationMs: elapsed(),
      }),
    operationalFailed: (errorCode: string) =>
      emit({
        type: 'pricing_operational_failed',
        method,
        projectionName,
        errorCode,
        durationMs: elapsed(),
      }),
    lagDetected: (lagMs: number) =>
      emit({ type: 'pricing_projection_lag_detected', method, projectionName, lagMs }),
    driftDetected: () =>
      emit({ type: 'pricing_projection_drift_detected', method, projectionName }),
    replayVerified: () =>
      emit({ type: 'pricing_projection_replay_verified', method, projectionName }),
    healthUpdated: (
      health?: PricingProjectionHealthStatus,
      readiness?: PricingOperationalReadiness
    ) =>
      emit({
        type: 'pricing_projection_health_updated',
        method,
        projectionName,
        health,
        readiness,
        durationMs: elapsed(),
      }),
  };
};
