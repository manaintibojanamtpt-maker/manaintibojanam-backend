/**
 * DiscoverySDK — branch candidate expansion telemetry (M5 PR-6).
 */

import type { BranchCandidateExpansionMode } from './BranchCandidateTypes';

export type BranchCandidateTelemetryEventType =
  | 'BRANCH_CANDIDATE_EXPANSION_START'
  | 'BRANCH_CANDIDATE_EXPANSION_COMPLETE'
  | 'BRANCH_CANDIDATE_TENANT_FALLBACK'
  | 'BRANCH_CANDIDATE_FLAG_OFF';

export interface BranchCandidateTelemetryEvent {
  readonly type: BranchCandidateTelemetryEventType;
  readonly mode: BranchCandidateExpansionMode;
  readonly tenantCount: number;
  readonly branchCount: number;
  readonly candidateCount: number;
  readonly expandedTenantCount: number;
  readonly fallbackTenantCount: number;
  readonly durationMs?: number;
}

export type BranchCandidateTelemetryHook = (event: BranchCandidateTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createBranchCandidateTelemetryTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const emitBranchCandidateTelemetry = (
  hook: BranchCandidateTelemetryHook | undefined,
  event: BranchCandidateTelemetryEvent
): void => {
  hook?.(event);
};

export const recordBranchCandidateExpansionStart = (
  hook: BranchCandidateTelemetryHook | undefined,
  mode: BranchCandidateExpansionMode,
  tenantCount: number
): void => {
  emitBranchCandidateTelemetry(hook, {
    type: 'BRANCH_CANDIDATE_EXPANSION_START',
    mode,
    tenantCount,
    branchCount: 0,
    candidateCount: 0,
    expandedTenantCount: 0,
    fallbackTenantCount: 0,
  });
};

export const recordBranchCandidateExpansionComplete = (
  hook: BranchCandidateTelemetryHook | undefined,
  input: {
    readonly mode: BranchCandidateExpansionMode;
    readonly tenantCount: number;
    readonly branchCount: number;
    readonly candidateCount: number;
    readonly expandedTenantCount: number;
    readonly fallbackTenantCount: number;
    readonly durationMs: number;
  }
): void => {
  emitBranchCandidateTelemetry(hook, {
    type: 'BRANCH_CANDIDATE_EXPANSION_COMPLETE',
    ...input,
  });
};

export const recordBranchCandidateTenantFallback = (
  hook: BranchCandidateTelemetryHook | undefined,
  input: {
    readonly mode: BranchCandidateExpansionMode;
    readonly tenantCount: number;
    readonly fallbackTenantCount: number;
  }
): void => {
  emitBranchCandidateTelemetry(hook, {
    type: 'BRANCH_CANDIDATE_TENANT_FALLBACK',
    mode: input.mode,
    tenantCount: input.tenantCount,
    branchCount: 0,
    candidateCount: input.fallbackTenantCount,
    expandedTenantCount: 0,
    fallbackTenantCount: input.fallbackTenantCount,
  });
};

export const recordBranchCandidateFlagOff = (
  hook: BranchCandidateTelemetryHook | undefined,
  tenantCount: number,
  candidateCount: number
): void => {
  emitBranchCandidateTelemetry(hook, {
    type: 'BRANCH_CANDIDATE_FLAG_OFF',
    mode: 'tenant_as_branch',
    tenantCount,
    branchCount: 0,
    candidateCount,
    expandedTenantCount: 0,
    fallbackTenantCount: candidateCount,
  });
};
