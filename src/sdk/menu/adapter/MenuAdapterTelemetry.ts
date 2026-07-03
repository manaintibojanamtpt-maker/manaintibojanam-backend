/**
 * Menu adapter telemetry (M7 PR-11).
 */

import type { MenuReadSource } from '../../../domain/menu/adapter/MenuReadSource';

export type MenuAdapterTelemetryEventType =
  | 'menu_adapter_started'
  | 'menu_adapter_completed'
  | 'menu_adapter_failed'
  | 'menu_adapter_fallback'
  | 'menu_adapter_projection_selected'
  | 'menu_adapter_legacy_selected';

export interface MenuAdapterTelemetryEvent {
  readonly type: MenuAdapterTelemetryEventType;
  readonly method: string;
  readonly catalogId?: string;
  readonly source?: MenuReadSource;
  readonly reason?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type MenuAdapterTelemetryHook = (event: MenuAdapterTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuAdapterTelemetryEmitter = (
  hook: MenuAdapterTelemetryHook | undefined,
  method: string,
  catalogId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuAdapterTelemetryEvent) => hook?.(event);

  return {
    adapterStarted: () => emit({ type: 'menu_adapter_started', method, catalogId }),
    adapterCompleted: (source?: MenuReadSource) =>
      emit({
        type: 'menu_adapter_completed',
        method,
        catalogId,
        source,
        durationMs: elapsed(),
      }),
    adapterFailed: (errorCode: string, source?: MenuReadSource) =>
      emit({
        type: 'menu_adapter_failed',
        method,
        catalogId,
        source,
        errorCode,
        durationMs: elapsed(),
      }),
    adapterFallback: (reason: string) =>
      emit({ type: 'menu_adapter_fallback', method, catalogId, reason, durationMs: elapsed() }),
    projectionSelected: () =>
      emit({ type: 'menu_adapter_projection_selected', method, catalogId, source: 'projection' }),
    legacySelected: (reason?: string) =>
      emit({
        type: 'menu_adapter_legacy_selected',
        method,
        catalogId,
        source: 'legacy',
        reason,
      }),
  };
};
