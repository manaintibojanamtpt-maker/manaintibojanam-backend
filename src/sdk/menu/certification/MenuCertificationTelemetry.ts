/**
 * Menu certification telemetry (M7 PR-13).
 */

import type { MenuCertificationStatus } from '../../../domain/menu/certification/MenuCertificationStatus';

export type MenuCertificationTelemetryEventType =
  | 'menu_projection_certification_started'
  | 'menu_projection_certification_completed'
  | 'menu_projection_certification_failed'
  | 'menu_projection_certification_ready'
  | 'menu_projection_certification_not_ready';

export interface MenuCertificationTelemetryEvent {
  readonly type: MenuCertificationTelemetryEventType;
  readonly method: string;
  readonly certificationId?: string;
  readonly status?: MenuCertificationStatus;
  readonly reason?: string;
  readonly durationMs?: number;
}

export type MenuCertificationTelemetryHook = (event: MenuCertificationTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuCertificationTelemetryEmitter = (
  hook: MenuCertificationTelemetryHook | undefined,
  method: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuCertificationTelemetryEvent) => hook?.(event);

  return {
    certificationStarted: (certificationId?: string) =>
      emit({ type: 'menu_projection_certification_started', method, certificationId }),
    certificationCompleted: (certificationId: string, status: MenuCertificationStatus) =>
      emit({
        type: 'menu_projection_certification_completed',
        method,
        certificationId,
        status,
        durationMs: elapsed(),
      }),
    certificationFailed: (reason: string, certificationId?: string) =>
      emit({
        type: 'menu_projection_certification_failed',
        method,
        certificationId,
        reason,
        durationMs: elapsed(),
      }),
    certificationReady: (certificationId: string) =>
      emit({
        type: 'menu_projection_certification_ready',
        method,
        certificationId,
        status: 'READY',
        durationMs: elapsed(),
      }),
    certificationNotReady: (certificationId: string, reason: string) =>
      emit({
        type: 'menu_projection_certification_not_ready',
        method,
        certificationId,
        status: 'NOT_READY',
        reason,
        durationMs: elapsed(),
      }),
  };
};
