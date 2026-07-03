/**
 * Menu parity telemetry (M7 PR-8).
 */

import type { MenuParityOutcome } from '../../../domain/menu/parity/MenuParityResult';

export type MenuParityTelemetryEventType =
  | 'menu_parity_started'
  | 'menu_parity_completed'
  | 'menu_parity_failed'
  | 'menu_parity_match'
  | 'menu_parity_mismatch';

export interface MenuParityTelemetryEvent {
  readonly type: MenuParityTelemetryEventType;
  readonly method: string;
  readonly catalogId?: string;
  readonly outcome?: MenuParityOutcome;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type MenuParityTelemetryHook = (event: MenuParityTelemetryEvent) => void;

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createMenuParityTelemetryEmitter = (
  hook: MenuParityTelemetryHook | undefined,
  method: string,
  catalogId?: string
) => {
  const start = now();
  const elapsed = () => Math.max(0, Math.round(now() - start));
  const emit = (event: MenuParityTelemetryEvent) => hook?.(event);

  return {
    parityStarted: () => emit({ type: 'menu_parity_started', method, catalogId }),
    parityCompleted: (outcome?: MenuParityOutcome) =>
      emit({
        type: 'menu_parity_completed',
        method,
        catalogId,
        outcome,
        durationMs: elapsed(),
      }),
    parityFailed: (errorCode: string) =>
      emit({
        type: 'menu_parity_failed',
        method,
        catalogId,
        errorCode,
        durationMs: elapsed(),
      }),
    parityMatch: (outcome: MenuParityOutcome) =>
      emit({ type: 'menu_parity_match', method, catalogId, outcome, durationMs: elapsed() }),
    parityMismatch: (outcome: MenuParityOutcome) =>
      emit({ type: 'menu_parity_mismatch', method, catalogId, outcome, durationMs: elapsed() }),
  };
};
