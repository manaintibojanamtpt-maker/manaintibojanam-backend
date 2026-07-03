/**
 * Projection certification telemetry (M6 PR-13).
 */

import type { ProjectionCertificationStatus } from '../../../domain/order/certification/ProjectionCertificationStatus';

export type ProjectionCertificationTelemetryEventType =
  | 'projection_certification_started'
  | 'projection_certification_completed'
  | 'projection_certification_failed'
  | 'projection_certification_ready'
  | 'projection_certification_not_ready';

export interface ProjectionCertificationTelemetryEvent {
  readonly type: ProjectionCertificationTelemetryEventType;
  readonly method: string;
  readonly certificationId?: string;
  readonly status?: ProjectionCertificationStatus;
  readonly reason?: string;
  readonly durationMs?: number;
}

export type ProjectionCertificationTelemetryHook = (
  event: ProjectionCertificationTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createProjectionCertificationTelemetryEmitter = (
  hook: ProjectionCertificationTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: ProjectionCertificationTelemetryEvent) => hook?.(event);

  return {
    certificationStarted: (certificationId?: string) =>
      emit({ type: 'projection_certification_started', method, certificationId }),
    certificationCompleted: (certificationId: string, status: ProjectionCertificationStatus) =>
      emit({
        type: 'projection_certification_completed',
        method,
        certificationId,
        status,
        durationMs: elapsed(),
      }),
    certificationFailed: (reason: string, certificationId?: string) =>
      emit({
        type: 'projection_certification_failed',
        method,
        certificationId,
        reason,
        durationMs: elapsed(),
      }),
    certificationReady: (certificationId: string) =>
      emit({
        type: 'projection_certification_ready',
        method,
        certificationId,
        status: 'READY',
        durationMs: elapsed(),
      }),
    certificationNotReady: (certificationId: string, reason: string) =>
      emit({
        type: 'projection_certification_not_ready',
        method,
        certificationId,
        status: 'NOT_READY',
        reason,
        durationMs: elapsed(),
      }),
  };
};
