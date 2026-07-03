/**
 * M5 PR-5 — Branch facade telemetry (in-memory + optional hook).
 */

import type {
  BranchFacadeOperation,
  BranchPresentationTelemetryEvent,
  BranchPresentationTelemetryHook,
  BranchSessionStatus,
  BranchTelemetrySnapshot,
} from './types';
import { EMPTY_BRANCH_TELEMETRY } from './types';

let telemetrySnapshot: BranchTelemetrySnapshot = EMPTY_BRANCH_TELEMETRY;
let telemetryHook: BranchPresentationTelemetryHook | undefined;

export function setBranchTelemetryHook(hook: BranchPresentationTelemetryHook | undefined): void {
  telemetryHook = hook;
}

export function getBranchTelemetrySnapshot(): BranchTelemetrySnapshot {
  return telemetrySnapshot;
}

export function resetBranchTelemetry(): void {
  telemetrySnapshot = EMPTY_BRANCH_TELEMETRY;
}

export function emitBranchPresentationTelemetry(event: BranchPresentationTelemetryEvent): void {
  telemetryHook?.(event);
}

export function beginBranchTelemetry(
  attemptId: string,
  operation: BranchFacadeOperation
): BranchTelemetrySnapshot {
  telemetrySnapshot = {
    attemptId,
    operation,
    startedAt: Date.now(),
    completedAt: null,
    status: 'loading',
    contextMs: null,
    sdkMs: null,
    totalMs: null,
  };

  emitBranchPresentationTelemetry({
    type: 'request',
    operation,
    attemptId,
  });

  return telemetrySnapshot;
}

export function recordBranchContextTiming(contextMs: number): void {
  telemetrySnapshot = {
    ...telemetrySnapshot,
    contextMs,
  };
}

export function completeBranchTelemetry(
  status: BranchSessionStatus,
  sdkMs?: number
): BranchTelemetrySnapshot {
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

export function recordBranchRetryTelemetry(retryCount: number): void {
  if (!telemetrySnapshot.operation) {
    return;
  }

  emitBranchPresentationTelemetry({
    type: 'retry',
    operation: telemetrySnapshot.operation,
    attemptId: telemetrySnapshot.attemptId,
    retryCount,
  });
}

export function recordBranchSuccessTelemetry(): void {
  if (!telemetrySnapshot.operation) {
    return;
  }

  emitBranchPresentationTelemetry({
    type: 'success',
    operation: telemetrySnapshot.operation,
    attemptId: telemetrySnapshot.attemptId,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}

export function recordBranchFailureTelemetry(errorCode: string): void {
  if (!telemetrySnapshot.operation) {
    return;
  }

  emitBranchPresentationTelemetry({
    type: 'failure',
    operation: telemetrySnapshot.operation,
    attemptId: telemetrySnapshot.attemptId,
    errorCode,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}

export function recordBranchCancelTelemetry(): void {
  emitBranchPresentationTelemetry({
    type: 'cancel',
    operation: telemetrySnapshot.operation,
    attemptId: telemetrySnapshot.attemptId,
  });
}
