/**
 * Projection operational telemetry (M6 PR-10).
 */

import type { ProjectionOperationalHealthStatus } from '../../../domain/events/operations/ProjectionHealth';
import type { ProjectionOperationalReadiness } from '../../../domain/events/operations/ProjectionOperationalRules';

export type ProjectionOperationalTelemetryEventType =
  | 'projection_operational_started'
  | 'projection_operational_completed'
  | 'projection_operational_failed'
  | 'projection_lag_detected'
  | 'projection_drift_detected'
  | 'projection_replay_verified'
  | 'projection_health_updated';

export interface ProjectionOperationalTelemetryEvent {
  readonly type: ProjectionOperationalTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly health?: ProjectionOperationalHealthStatus;
  readonly readiness?: ProjectionOperationalReadiness;
  readonly lagMs?: number;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type ProjectionOperationalTelemetryHook = (
  event: ProjectionOperationalTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createProjectionOperationalTelemetryEmitter = (
  hook: ProjectionOperationalTelemetryHook | undefined,
  method: string,
  projectionName?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: ProjectionOperationalTelemetryEvent) => hook?.(event);

  return {
    operationalStarted: () =>
      emit({ type: 'projection_operational_started', method, projectionName }),
    operationalCompleted: (
      health?: ProjectionOperationalHealthStatus,
      readiness?: ProjectionOperationalReadiness
    ) =>
      emit({
        type: 'projection_operational_completed',
        method,
        projectionName,
        health,
        readiness,
        durationMs: elapsed(),
      }),
    operationalFailed: (errorCode: string) =>
      emit({
        type: 'projection_operational_failed',
        method,
        projectionName,
        errorCode,
        durationMs: elapsed(),
      }),
    lagDetected: (lagMs: number) =>
      emit({ type: 'projection_lag_detected', method, projectionName, lagMs }),
    driftDetected: () =>
      emit({ type: 'projection_drift_detected', method, projectionName }),
    replayVerified: () =>
      emit({ type: 'projection_replay_verified', method, projectionName }),
    healthUpdated: (
      health?: ProjectionOperationalHealthStatus,
      readiness?: ProjectionOperationalReadiness
    ) =>
      emit({
        type: 'projection_health_updated',
        method,
        projectionName,
        health,
        readiness,
        durationMs: elapsed(),
      }),
  };
};
