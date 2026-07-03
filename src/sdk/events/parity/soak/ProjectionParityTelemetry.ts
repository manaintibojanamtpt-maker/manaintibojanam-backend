/**
 * Projection parity soak telemetry (M6 PR-9).
 */

import type { ParityCertificationStatus } from '../../../../domain/events/parity/soak/ParityReadiness';
import type { ProjectionHealthStatus } from '../../../../domain/events/parity/soak/ParityHealthScore';

export type ProjectionParitySoakTelemetryEventType =
  | 'projection_soak_started'
  | 'projection_soak_completed'
  | 'projection_soak_failed'
  | 'projection_readiness_generated'
  | 'projection_certification_generated';

export interface ProjectionParitySoakTelemetryEvent {
  readonly type: ProjectionParitySoakTelemetryEventType;
  readonly method: string;
  readonly reportCount?: number;
  readonly health?: ProjectionHealthStatus;
  readonly certification?: ParityCertificationStatus;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type ProjectionParitySoakTelemetryHook = (
  event: ProjectionParitySoakTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createProjectionParitySoakTelemetryEmitter = (
  hook: ProjectionParitySoakTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: ProjectionParitySoakTelemetryEvent) => hook?.(event);

  return {
    soakStarted: (reportCount?: number) =>
      emit({ type: 'projection_soak_started', method, reportCount }),
    soakCompleted: (reportCount?: number) =>
      emit({ type: 'projection_soak_completed', method, reportCount, durationMs: elapsed() }),
    soakFailed: (errorCode: string) =>
      emit({ type: 'projection_soak_failed', method, errorCode, durationMs: elapsed() }),
    readinessGenerated: (health?: ProjectionHealthStatus, certification?: ParityCertificationStatus) =>
      emit({
        type: 'projection_readiness_generated',
        method,
        health,
        certification,
        durationMs: elapsed(),
      }),
    certificationGenerated: (
      health?: ProjectionHealthStatus,
      certification?: ParityCertificationStatus
    ) =>
      emit({
        type: 'projection_certification_generated',
        method,
        health,
        certification,
        durationMs: elapsed(),
      }),
  };
};
