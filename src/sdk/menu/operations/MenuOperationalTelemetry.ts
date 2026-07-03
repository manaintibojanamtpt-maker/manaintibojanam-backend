/**
 * Menu operational telemetry (M7 PR-10).
 */

import type { MenuProjectionHealthStatus } from '../../../domain/menu/operations/MenuProjectionHealth';
import type { MenuOperationalReadiness } from '../../../domain/menu/operations/MenuOperationalRules';

export type MenuOperationalTelemetryEventType =
  | 'menu_operational_started'
  | 'menu_operational_completed'
  | 'menu_operational_failed'
  | 'menu_projection_lag_detected'
  | 'menu_projection_drift_detected'
  | 'menu_projection_replay_verified'
  | 'menu_projection_health_updated';

export interface MenuOperationalTelemetryEvent {
  readonly type: MenuOperationalTelemetryEventType;
  readonly method: string;
  readonly projectionName?: string;
  readonly health?: MenuProjectionHealthStatus;
  readonly readiness?: MenuOperationalReadiness;
  readonly lagMs?: number;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type MenuOperationalTelemetryHook = (event: MenuOperationalTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuOperationalTelemetryEmitter = (
  hook: MenuOperationalTelemetryHook | undefined,
  method: string,
  projectionName?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuOperationalTelemetryEvent) => hook?.(event);

  return {
    operationalStarted: () =>
      emit({ type: 'menu_operational_started', method, projectionName }),
    operationalCompleted: (
      health?: MenuProjectionHealthStatus,
      readiness?: MenuOperationalReadiness
    ) =>
      emit({
        type: 'menu_operational_completed',
        method,
        projectionName,
        health,
        readiness,
        durationMs: elapsed(),
      }),
    operationalFailed: (errorCode: string) =>
      emit({
        type: 'menu_operational_failed',
        method,
        projectionName,
        errorCode,
        durationMs: elapsed(),
      }),
    lagDetected: (lagMs: number) =>
      emit({ type: 'menu_projection_lag_detected', method, projectionName, lagMs }),
    driftDetected: () =>
      emit({ type: 'menu_projection_drift_detected', method, projectionName }),
    replayVerified: () =>
      emit({ type: 'menu_projection_replay_verified', method, projectionName }),
    healthUpdated: (
      health?: MenuProjectionHealthStatus,
      readiness?: MenuOperationalReadiness
    ) =>
      emit({
        type: 'menu_projection_health_updated',
        method,
        projectionName,
        health,
        readiness,
        durationMs: elapsed(),
      }),
  };
};
