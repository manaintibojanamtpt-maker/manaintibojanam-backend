/**
 * M4 PR-4 — Search facade telemetry (in-memory, presentation layer).
 */

import type { SearchSessionStatus, SearchTelemetrySnapshot } from './types';
import { EMPTY_SEARCH_TELEMETRY } from './types';

let telemetrySnapshot: SearchTelemetrySnapshot = EMPTY_SEARCH_TELEMETRY;

export function getSearchTelemetrySnapshot(): SearchTelemetrySnapshot {
  return telemetrySnapshot;
}

export function resetSearchTelemetry(): void {
  telemetrySnapshot = EMPTY_SEARCH_TELEMETRY;
}

export function beginSearchTelemetry(attemptId: string): SearchTelemetrySnapshot {
  telemetrySnapshot = {
    attemptId,
    startedAt: Date.now(),
    completedAt: null,
    status: 'loading',
    contextMs: null,
    sdkMs: null,
    totalMs: null,
  };
  return telemetrySnapshot;
}

export function recordSearchContextTiming(contextMs: number): void {
  telemetrySnapshot = {
    ...telemetrySnapshot,
    contextMs,
  };
}

export function completeSearchTelemetry(status: SearchSessionStatus, sdkMs?: number): SearchTelemetrySnapshot {
  const completedAt = Date.now();
  telemetrySnapshot = {
    ...telemetrySnapshot,
    completedAt,
    status,
    sdkMs: sdkMs ?? telemetrySnapshot.sdkMs,
    totalMs: completedAt - telemetrySnapshot.startedAt,
  };
  return telemetrySnapshot;
}
