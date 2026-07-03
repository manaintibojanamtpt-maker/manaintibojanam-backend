/**
 * MenuSDK — orchestration telemetry (M7 PR-4).
 */

export type MenuTelemetryEventType =
  | 'menu_request'
  | 'menu_success'
  | 'menu_failure'
  | 'repository_read'
  | 'validation_completed';

export interface MenuTelemetryTimingMs {
  readonly validationMs?: number;
  readonly repositoryMs?: number;
  readonly domainMs?: number;
  readonly totalMs?: number;
}

export interface MenuTelemetryEvent {
  readonly type: MenuTelemetryEventType;
  readonly method: string;
  readonly tenantId?: string;
  readonly itemId?: string;
  readonly timingMs?: MenuTelemetryTimingMs;
  readonly errorCode?: string;
}

export type MenuTelemetryHook = (event: MenuTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuPipelineTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const createMenuTelemetryEmitter = (
  hook: MenuTelemetryHook | undefined,
  method: string
) => {
  const totalTimer = createMenuPipelineTimer();

  const emit = (event: MenuTelemetryEvent) => hook?.(event);

  return {
    request: (context?: { tenantId?: string; itemId?: string }) => {
      emit({
        type: 'menu_request',
        method,
        tenantId: context?.tenantId,
        itemId: context?.itemId,
      });
    },
    repositoryRead: (context?: { tenantId?: string }) => {
      emit({ type: 'repository_read', method, tenantId: context?.tenantId });
    },
    validationCompleted: (timingMs?: MenuTelemetryTimingMs) => {
      emit({ type: 'validation_completed', method, timingMs });
    },
    success: (timingMs?: MenuTelemetryTimingMs, context?: { tenantId?: string }) => {
      emit({
        type: 'menu_success',
        method,
        tenantId: context?.tenantId,
        timingMs: { ...timingMs, totalMs: totalTimer() },
      });
    },
    failure: (errorCode: string, context?: { tenantId?: string }) => {
      emit({
        type: 'menu_failure',
        method,
        tenantId: context?.tenantId,
        errorCode,
        timingMs: { totalMs: totalTimer() },
      });
    },
  };
};
