/**
 * BranchSDK — assignment engine telemetry (M5 PR-7).
 */

import type { BranchId } from '../types/branded';

export type BranchAssignmentTelemetryEventType =
  | 'BRANCH_ASSIGNMENT_REQUEST'
  | 'BRANCH_ASSIGNMENT_SUCCESS'
  | 'BRANCH_ASSIGNMENT_FAILURE'
  | 'BRANCH_ASSIGNMENT_NO_ELIGIBLE'
  | 'BRANCH_ASSIGNMENT_PREFERRED'
  | 'BRANCH_ASSIGNMENT_SCORE_REJECTED';

export interface BranchAssignmentTelemetryEvent {
  readonly type: BranchAssignmentTelemetryEventType;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly correlationId?: string;
  readonly candidatesEvaluated?: number;
  readonly eligibleCount?: number;
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export type BranchAssignmentTelemetryHook = (event: BranchAssignmentTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createAssignmentTelemetryTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const emitBranchAssignmentTelemetry = (
  hook: BranchAssignmentTelemetryHook | undefined,
  event: BranchAssignmentTelemetryEvent
): void => {
  hook?.(event);
};

export const recordAssignmentRequest = (
  hook: BranchAssignmentTelemetryHook | undefined,
  input: { readonly tenantId: string; readonly correlationId?: string; readonly candidateCount: number }
): void => {
  emitBranchAssignmentTelemetry(hook, {
    type: 'BRANCH_ASSIGNMENT_REQUEST',
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    candidatesEvaluated: input.candidateCount,
  });
};

export const recordAssignmentSuccess = (
  hook: BranchAssignmentTelemetryHook | undefined,
  input: {
    readonly tenantId: string;
    readonly branchId: BranchId;
    readonly correlationId?: string;
    readonly eligibleCount: number;
    readonly durationMs: number;
  }
): void => {
  emitBranchAssignmentTelemetry(hook, {
    type: 'BRANCH_ASSIGNMENT_SUCCESS',
    tenantId: input.tenantId,
    branchId: String(input.branchId),
    correlationId: input.correlationId,
    eligibleCount: input.eligibleCount,
    durationMs: input.durationMs,
  });
};

export const recordAssignmentFailure = (
  hook: BranchAssignmentTelemetryHook | undefined,
  input: {
    readonly tenantId: string;
    readonly correlationId?: string;
    readonly errorCode: string;
    readonly durationMs: number;
  }
): void => {
  emitBranchAssignmentTelemetry(hook, {
    type: 'BRANCH_ASSIGNMENT_FAILURE',
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    errorCode: input.errorCode,
    durationMs: input.durationMs,
  });
};

export const recordAssignmentNoEligible = (
  hook: BranchAssignmentTelemetryHook | undefined,
  input: { readonly tenantId: string; readonly correlationId?: string; readonly durationMs: number }
): void => {
  emitBranchAssignmentTelemetry(hook, {
    type: 'BRANCH_ASSIGNMENT_NO_ELIGIBLE',
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    durationMs: input.durationMs,
  });
};

export const recordAssignmentPreferred = (
  hook: BranchAssignmentTelemetryHook | undefined,
  input: { readonly tenantId: string; readonly branchId: BranchId; readonly correlationId?: string }
): void => {
  emitBranchAssignmentTelemetry(hook, {
    type: 'BRANCH_ASSIGNMENT_PREFERRED',
    tenantId: input.tenantId,
    branchId: String(input.branchId),
    correlationId: input.correlationId,
  });
};

export const recordAssignmentScoreRejected = (
  hook: BranchAssignmentTelemetryHook | undefined,
  input: { readonly tenantId: string; readonly branchId: BranchId; readonly correlationId?: string }
): void => {
  emitBranchAssignmentTelemetry(hook, {
    type: 'BRANCH_ASSIGNMENT_SCORE_REJECTED',
    tenantId: input.tenantId,
    branchId: String(input.branchId),
    correlationId: input.correlationId,
  });
};
