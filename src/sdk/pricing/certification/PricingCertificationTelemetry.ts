/**
 * Pricing certification telemetry (M8 PR-13).
 */

import type { PricingCertificationStatus } from '../../../domain/pricing/certification/PricingCertificationStatus';

export type PricingCertificationTelemetryEventType =
  | 'pricing_projection_certification_started'
  | 'pricing_projection_certification_completed'
  | 'pricing_projection_certification_failed'
  | 'pricing_projection_certification_ready'
  | 'pricing_projection_certification_not_ready';

export interface PricingCertificationTelemetryEvent {
  readonly type: PricingCertificationTelemetryEventType;
  readonly method: string;
  readonly certificationId?: string;
  readonly status?: PricingCertificationStatus;
  readonly reason?: string;
  readonly durationMs?: number;
}

export type PricingCertificationTelemetryHook = (event: PricingCertificationTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPricingCertificationTelemetryEmitter = (
  hook: PricingCertificationTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: PricingCertificationTelemetryEvent) => hook?.(event);

  return {
    certificationStarted: (certificationId?: string) =>
      emit({ type: 'pricing_projection_certification_started', method, certificationId }),
    certificationCompleted: (certificationId: string, status: PricingCertificationStatus) =>
      emit({
        type: 'pricing_projection_certification_completed',
        method,
        certificationId,
        status,
        durationMs: elapsed(),
      }),
    certificationFailed: (reason: string, certificationId?: string) =>
      emit({
        type: 'pricing_projection_certification_failed',
        method,
        certificationId,
        reason,
        durationMs: elapsed(),
      }),
    certificationReady: (certificationId: string) =>
      emit({
        type: 'pricing_projection_certification_ready',
        method,
        certificationId,
        status: 'READY',
        durationMs: elapsed(),
      }),
    certificationNotReady: (certificationId: string, reason: string) =>
      emit({
        type: 'pricing_projection_certification_not_ready',
        method,
        certificationId,
        status: 'NOT_READY',
        reason,
        durationMs: elapsed(),
      }),
  };
};
