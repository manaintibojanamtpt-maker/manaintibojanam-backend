/**
 * M7 PR-5 — Menu facade telemetry.
 */

import type { MenuSessionStatus } from './MenuContext';

export type MenuFacadeTelemetryEventType =
  | 'menu_facade_request'
  | 'menu_facade_success'
  | 'menu_facade_failure'
  | 'menu_facade_retry'
  | 'menu_facade_reset';

export interface MenuFacadeTelemetryEvent {
  readonly type: MenuFacadeTelemetryEventType;
  readonly method: string;
  readonly tenantId?: string;
  readonly status?: MenuSessionStatus;
  readonly errorCode?: string;
  readonly durationMs?: number;
}

export type MenuFacadeTelemetryHook = (event: MenuFacadeTelemetryEvent) => void;

let globalHook: MenuFacadeTelemetryHook | undefined;

export const setMenuFacadeTelemetryHook = (hook: MenuFacadeTelemetryHook | undefined): void => {
  globalHook = hook;
};

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuFacadeTelemetryEmitter = (
  hook: MenuFacadeTelemetryHook | undefined,
  method: string
) => {
  const resolvedHook = hook ?? globalHook;
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuFacadeTelemetryEvent) => resolvedHook?.(event);

  return {
    request: (tenantId?: string) =>
      emit({ type: 'menu_facade_request', method, tenantId }),
    success: (tenantId?: string, status?: MenuSessionStatus) =>
      emit({
        type: 'menu_facade_success',
        method,
        tenantId,
        status,
        durationMs: elapsed(),
      }),
    failure: (errorCode: string, tenantId?: string) =>
      emit({
        type: 'menu_facade_failure',
        method,
        tenantId,
        errorCode,
        durationMs: elapsed(),
      }),
    retry: (tenantId?: string) =>
      emit({ type: 'menu_facade_retry', method, tenantId, durationMs: elapsed() }),
    reset: () => emit({ type: 'menu_facade_reset', method, durationMs: elapsed() }),
  };
};
