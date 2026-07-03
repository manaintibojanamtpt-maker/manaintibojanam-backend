/**
 * M5 PR-9 — Order branch persistence telemetry.
 */

export type OrderBranchTelemetryEvent =
  | {
      readonly type: 'persist_request';
      readonly tenantId: string;
      readonly legacy?: boolean;
    }
  | {
      readonly type: 'persist_success';
      readonly tenantId: string;
      readonly branchId: string;
      readonly legacy?: boolean;
      readonly timingMs?: number;
    }
  | {
      readonly type: 'persist_skipped';
      readonly tenantId: string;
      readonly reason: 'flag_off';
    }
  | {
      readonly type: 'persist_failure';
      readonly tenantId: string;
      readonly errorCode: string;
      readonly timingMs?: number;
    };

export type OrderBranchTelemetryHook = (event: OrderBranchTelemetryEvent) => void;

export interface OrderBranchTelemetrySnapshot {
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly totalMs: number | null;
}

export const EMPTY_ORDER_BRANCH_TELEMETRY: OrderBranchTelemetrySnapshot = {
  startedAt: 0,
  completedAt: null,
  totalMs: null,
};

let telemetryHook: OrderBranchTelemetryHook | undefined;
let telemetrySnapshot: OrderBranchTelemetrySnapshot = EMPTY_ORDER_BRANCH_TELEMETRY;

export function setOrderBranchTelemetryHook(hook: OrderBranchTelemetryHook | undefined): void {
  telemetryHook = hook;
}

export function getOrderBranchTelemetrySnapshot(): OrderBranchTelemetrySnapshot {
  return telemetrySnapshot;
}

export function resetOrderBranchTelemetry(): void {
  telemetrySnapshot = EMPTY_ORDER_BRANCH_TELEMETRY;
}

const emit = (event: OrderBranchTelemetryEvent): void => {
  telemetryHook?.(event);
};

export function beginOrderBranchTelemetry(): number {
  const startedAt = Date.now();
  telemetrySnapshot = {
    startedAt,
    completedAt: null,
    totalMs: null,
  };
  return startedAt;
}

export function completeOrderBranchTelemetry(): OrderBranchTelemetrySnapshot {
  const completedAt = Date.now();
  telemetrySnapshot = {
    ...telemetrySnapshot,
    completedAt,
    totalMs: completedAt - telemetrySnapshot.startedAt,
  };
  return telemetrySnapshot;
}

export function recordOrderBranchPersistRequest(tenantId: string, legacy = false): void {
  emit({ type: 'persist_request', tenantId, legacy });
}

export function recordOrderBranchPersistSuccess(
  tenantId: string,
  branchId: string,
  legacy = false
): void {
  emit({
    type: 'persist_success',
    tenantId,
    branchId,
    legacy,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}

export function recordOrderBranchPersistSkipped(tenantId: string): void {
  emit({ type: 'persist_skipped', tenantId, reason: 'flag_off' });
}

export function recordOrderBranchPersistFailure(tenantId: string, errorCode: string): void {
  emit({
    type: 'persist_failure',
    tenantId,
    errorCode,
    timingMs: telemetrySnapshot.totalMs ?? undefined,
  });
}
