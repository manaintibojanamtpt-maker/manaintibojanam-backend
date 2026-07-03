/**
 * M5 PR-8 — Checkout branch assignment telemetry.
 */

import type { CheckoutBranchSessionStatus } from './CheckoutBranchSession';

export type CheckoutBranchTelemetryEvent =
  | {
      readonly type: 'request';
      readonly attemptId: string;
      readonly tenantId?: string;
      readonly correlationId?: string;
    }
  | {
      readonly type: 'success';
      readonly attemptId: string;
      readonly branchId?: string;
      readonly timingMs?: number;
      readonly legacy?: boolean;
    }
  | {
      readonly type: 'failure';
      readonly attemptId: string;
      readonly errorCode: string;
      readonly timingMs?: number;
    }
  | {
      readonly type: 'retry';
      readonly attemptId: string;
      readonly retryCount: number;
    }
  | {
      readonly type: 'cancel';
      readonly attemptId: string;
    }
  | {
      readonly type: 'legacy';
      readonly attemptId: string;
    };

export type CheckoutBranchTelemetryHook = (event: CheckoutBranchTelemetryEvent) => void;

export interface CheckoutBranchTelemetrySnapshot {
  readonly attemptId: string;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly status: CheckoutBranchSessionStatus;
  readonly branchMs: number | null;
  readonly totalMs: number | null;
}

export const EMPTY_CHECKOUT_BRANCH_TELEMETRY: CheckoutBranchTelemetrySnapshot = {
  attemptId: '',
  startedAt: 0,
  completedAt: null,
  status: 'idle',
  branchMs: null,
  totalMs: null,
};

let telemetrySnapshot: CheckoutBranchTelemetrySnapshot = EMPTY_CHECKOUT_BRANCH_TELEMETRY;
let telemetryHook: CheckoutBranchTelemetryHook | undefined;

export function setCheckoutBranchTelemetryHook(
  hook: CheckoutBranchTelemetryHook | undefined
): void {
  telemetryHook = hook;
}

export function getCheckoutBranchTelemetrySnapshot(): CheckoutBranchTelemetrySnapshot {
  return telemetrySnapshot;
}

export function resetCheckoutBranchTelemetry(): void {
  telemetrySnapshot = EMPTY_CHECKOUT_BRANCH_TELEMETRY;
}

const emit = (event: CheckoutBranchTelemetryEvent): void => {
  telemetryHook?.(event);
};

export function beginCheckoutBranchTelemetry(attemptId: string): CheckoutBranchTelemetrySnapshot {
  telemetrySnapshot = {
    attemptId,
    startedAt: Date.now(),
    completedAt: null,
    status: 'loading',
    branchMs: null,
    totalMs: null,
  };

  emit({ type: 'request', attemptId });
  return telemetrySnapshot;
}

export function completeCheckoutBranchTelemetry(
  status: CheckoutBranchSessionStatus,
  branchMs?: number
): CheckoutBranchTelemetrySnapshot {
  const completedAt = Date.now();
  telemetrySnapshot = {
    ...telemetrySnapshot,
    completedAt,
    status,
    branchMs: branchMs ?? telemetrySnapshot.branchMs,
    totalMs: completedAt - telemetrySnapshot.startedAt,
  };
  return telemetrySnapshot;
}

export function recordCheckoutBranchSuccessTelemetry(
  branchId?: string,
  legacy = false
): void {
  emit({
    type: 'success',
    attemptId: telemetrySnapshot.attemptId,
    branchId,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
    legacy,
  });
}

export function recordCheckoutBranchFailureTelemetry(errorCode: string): void {
  emit({
    type: 'failure',
    attemptId: telemetrySnapshot.attemptId,
    errorCode,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}

export function recordCheckoutBranchRetryTelemetry(retryCount: number): void {
  emit({
    type: 'retry',
    attemptId: telemetrySnapshot.attemptId,
    retryCount,
  });
}

export function recordCheckoutBranchCancelTelemetry(): void {
  emit({
    type: 'cancel',
    attemptId: telemetrySnapshot.attemptId,
  });
}

export function recordCheckoutBranchLegacyTelemetry(): void {
  emit({
    type: 'legacy',
    attemptId: telemetrySnapshot.attemptId,
  });
}
