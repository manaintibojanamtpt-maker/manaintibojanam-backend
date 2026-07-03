/**
 * Menu catalog shadow projection telemetry (M7 PR-7).
 */

export type MenuCatalogProjectionTelemetryEventType =
  | 'menu_projection_started'
  | 'menu_projection_processed'
  | 'menu_projection_completed'
  | 'menu_projection_failed'
  | 'menu_projection_snapshot_saved';

export interface MenuCatalogProjectionTelemetryEvent {
  readonly type: MenuCatalogProjectionTelemetryEventType;
  readonly method: string;
  readonly catalogId?: string;
  readonly eventType?: string;
  readonly eventId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type MenuCatalogProjectionTelemetryHook = (
  event: MenuCatalogProjectionTelemetryEvent
) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuCatalogProjectionTelemetryEmitter = (
  hook: MenuCatalogProjectionTelemetryHook | undefined,
  method: string,
  catalogId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuCatalogProjectionTelemetryEvent) => hook?.(event);

  return {
    projectionStarted: (eventType?: string, eventId?: string) =>
      emit({ type: 'menu_projection_started', method, catalogId, eventType, eventId }),
    projectionProcessed: (eventType?: string, eventId?: string) =>
      emit({ type: 'menu_projection_processed', method, catalogId, eventType, eventId }),
    projectionCompleted: (eventType?: string, eventId?: string) =>
      emit({
        type: 'menu_projection_completed',
        method,
        catalogId,
        eventType,
        eventId,
        durationMs: elapsed(),
      }),
    projectionFailed: (errorCode: string, eventType?: string, eventId?: string) =>
      emit({
        type: 'menu_projection_failed',
        method,
        catalogId,
        eventType,
        eventId,
        errorCode,
        durationMs: elapsed(),
      }),
    snapshotSaved: (eventId?: string) =>
      emit({ type: 'menu_projection_snapshot_saved', method, catalogId, eventId }),
  };
};
