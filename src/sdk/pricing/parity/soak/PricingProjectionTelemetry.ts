/**
 * Pricing projection soak telemetry (M8 PR-9).
 */

import type { PricingProjectionCertificationStatus } from '../../../../domain/pricing/parity/soak/PricingProjectionReadiness';
import type { PricingProjectionHealthStatus } from '../../../../domain/pricing/parity/soak/PricingProjectionHealthScore';

export type PricingProjectionSoakTelemetryEventType =
  | 'pricing_projection_soak_started'
  | 'pricing_projection_soak_completed'
  | 'pricing_projection_soak_failed'
  | 'pricing_projection_readiness_generated'
  | 'pricing_projection_certification_generated';

export interface PricingProjectionSoakTelemetryEvent {
  readonly type: PricingProjectionSoakTelemetryEventType;
  readonly method: string;
  readonly reportCount?: number;
  readonly health?: PricingProjectionHealthStatus;
  readonly certification?: PricingProjectionCertificationStatus;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type PricingProjectionSoakTelemetryHook = (
  event: PricingProjectionSoakTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingProjectionSoakTelemetryEmitter = (
  hook: PricingProjectionSoakTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingProjectionSoakTelemetryEvent) => hook?.(event);

  return {
    soakStarted: (reportCount?: number) =>
      emit({ type: 'pricing_projection_soak_started', method, reportCount }),
    soakCompleted: (reportCount?: number) =>
      emit({
        type: 'pricing_projection_soak_completed',
        method,
        reportCount,
        durationMs: elapsed(),
      }),
    soakFailed: (errorCode: string) =>
      emit({ type: 'pricing_projection_soak_failed', method, errorCode, durationMs: elapsed() }),
    readinessGenerated: (
      health?: PricingProjectionHealthStatus,
      certification?: PricingProjectionCertificationStatus
    ) =>
      emit({
        type: 'pricing_projection_readiness_generated',
        method,
        health,
        certification,
        durationMs: elapsed(),
      }),
    certificationGenerated: (
      health?: PricingProjectionHealthStatus,
      certification?: PricingProjectionCertificationStatus
    ) =>
      emit({
        type: 'pricing_projection_certification_generated',
        method,
        health,
        certification,
        durationMs: elapsed(),
      }),
  };
};
