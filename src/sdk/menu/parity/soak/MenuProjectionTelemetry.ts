/**
 * Menu projection soak telemetry (M7 PR-9).
 */

import type { MenuProjectionCertificationStatus } from '../../../../domain/menu/parity/soak/MenuProjectionReadiness';
import type { MenuProjectionHealthStatus } from '../../../../domain/menu/parity/soak/MenuProjectionHealthScore';

export type MenuProjectionSoakTelemetryEventType =
  | 'menu_projection_soak_started'
  | 'menu_projection_soak_completed'
  | 'menu_projection_soak_failed'
  | 'menu_projection_readiness_generated'
  | 'menu_projection_certification_generated';

export interface MenuProjectionSoakTelemetryEvent {
  readonly type: MenuProjectionSoakTelemetryEventType;
  readonly method: string;
  readonly reportCount?: number;
  readonly health?: MenuProjectionHealthStatus;
  readonly certification?: MenuProjectionCertificationStatus;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type MenuProjectionSoakTelemetryHook = (
  event: MenuProjectionSoakTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuProjectionSoakTelemetryEmitter = (
  hook: MenuProjectionSoakTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuProjectionSoakTelemetryEvent) => hook?.(event);

  return {
    soakStarted: (reportCount?: number) =>
      emit({ type: 'menu_projection_soak_started', method, reportCount }),
    soakCompleted: (reportCount?: number) =>
      emit({
        type: 'menu_projection_soak_completed',
        method,
        reportCount,
        durationMs: elapsed(),
      }),
    soakFailed: (errorCode: string) =>
      emit({ type: 'menu_projection_soak_failed', method, errorCode, durationMs: elapsed() }),
    readinessGenerated: (
      health?: MenuProjectionHealthStatus,
      certification?: MenuProjectionCertificationStatus
    ) =>
      emit({
        type: 'menu_projection_readiness_generated',
        method,
        health,
        certification,
        durationMs: elapsed(),
      }),
    certificationGenerated: (
      health?: MenuProjectionHealthStatus,
      certification?: MenuProjectionCertificationStatus
    ) =>
      emit({
        type: 'menu_projection_certification_generated',
        method,
        health,
        certification,
        durationMs: elapsed(),
      }),
  };
};
