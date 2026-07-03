/**
 * M5 PR-13 — Owner branch presentation telemetry.
 */

import type { OwnerBranchFacadeOperation, OwnerBranchSessionStatus } from './types';

export type OwnerBranchTelemetryEvent =
  | {
      readonly type: 'request';
      readonly operation: OwnerBranchFacadeOperation;
      readonly attemptId: string;
      readonly tenantId?: string;
      readonly branchId?: string;
    }
  | {
      readonly type: 'success';
      readonly operation: OwnerBranchFacadeOperation;
      readonly attemptId: string;
      readonly timingMs?: number;
    }
  | {
      readonly type: 'failure';
      readonly operation: OwnerBranchFacadeOperation;
      readonly attemptId: string;
      readonly errorCode: string;
      readonly timingMs?: number;
    }
  | {
      readonly type: 'retry';
      readonly operation: OwnerBranchFacadeOperation;
      readonly attemptId: string;
      readonly retryCount: number;
    }
  | {
      readonly type: 'cancel';
      readonly operation: OwnerBranchFacadeOperation | null;
      readonly attemptId: string;
    }
  | {
      readonly type: 'disabled';
      readonly attemptId: string;
    };

export type OwnerBranchTelemetryHook = (event: OwnerBranchTelemetryEvent) => void;

export interface OwnerBranchTelemetrySnapshot {
  readonly attemptId: string;
  readonly operation: OwnerBranchFacadeOperation | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly status: OwnerBranchSessionStatus;
  readonly facadeMs: number | null;
  readonly totalMs: number | null;
}

export const EMPTY_OWNER_BRANCH_TELEMETRY: OwnerBranchTelemetrySnapshot = {
  attemptId: '',
  operation: null,
  startedAt: 0,
  completedAt: null,
  status: 'idle',
  facadeMs: null,
  totalMs: null,
};

let telemetrySnapshot: OwnerBranchTelemetrySnapshot = EMPTY_OWNER_BRANCH_TELEMETRY;
let telemetryHook: OwnerBranchTelemetryHook | undefined;

export function setOwnerBranchTelemetryHook(hook: OwnerBranchTelemetryHook | undefined): void {
  telemetryHook = hook;
}

export function getOwnerBranchTelemetrySnapshot(): OwnerBranchTelemetrySnapshot {
  return telemetrySnapshot;
}

export function resetOwnerBranchTelemetry(): void {
  telemetrySnapshot = EMPTY_OWNER_BRANCH_TELEMETRY;
}

const emit = (event: OwnerBranchTelemetryEvent): void => {
  telemetryHook?.(event);
};

export function beginOwnerBranchTelemetry(
  attemptId: string,
  operation: OwnerBranchFacadeOperation
): OwnerBranchTelemetrySnapshot {
  telemetrySnapshot = {
    attemptId,
    operation,
    startedAt: Date.now(),
    completedAt: null,
    status: 'loading',
    facadeMs: null,
    totalMs: null,
  };

  emit({ type: 'request', operation, attemptId });
  return telemetrySnapshot;
}

export function completeOwnerBranchTelemetry(
  status: OwnerBranchSessionStatus,
  facadeMs?: number
): OwnerBranchTelemetrySnapshot {
  const completedAt = Date.now();
  telemetrySnapshot = {
    ...telemetrySnapshot,
    completedAt,
    status,
    facadeMs: facadeMs ?? telemetrySnapshot.facadeMs,
    totalMs: completedAt - telemetrySnapshot.startedAt,
  };
  return telemetrySnapshot;
}

export function recordOwnerBranchSuccessTelemetry(
  operation: OwnerBranchFacadeOperation,
  attemptId: string
): void {
  emit({
    type: 'success',
    operation,
    attemptId,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}

export function recordOwnerBranchFailureTelemetry(
  operation: OwnerBranchFacadeOperation,
  attemptId: string,
  errorCode: string
): void {
  emit({
    type: 'failure',
    operation,
    attemptId,
    errorCode,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}

export function recordOwnerBranchRetryTelemetry(
  operation: OwnerBranchFacadeOperation,
  attemptId: string,
  retryCount: number
): void {
  emit({
    type: 'retry',
    operation,
    attemptId,
    retryCount,
  });
}

export function recordOwnerBranchDisabledTelemetry(attemptId: string): void {
  emit({ type: 'disabled', attemptId });
}

export function recordOwnerBranchCancelTelemetry(
  operation: OwnerBranchFacadeOperation | null,
  attemptId: string
): void {
  emit({ type: 'cancel', operation, attemptId });
}
