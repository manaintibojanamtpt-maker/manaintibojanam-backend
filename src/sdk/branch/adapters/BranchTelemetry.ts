/**
 * BranchSDK — orchestration telemetry (M5 PR-4).
 */

export type BranchTelemetryEventType =
  | 'BRANCH_SDK_REQUEST'
  | 'BRANCH_SDK_SUCCESS'
  | 'BRANCH_SDK_FAILURE'
  | 'BRANCH_REPOSITORY_READ'
  | 'BRANCH_DOMAIN_EVALUATION';

export interface BranchTelemetryTimingMs {
  readonly validationMs?: number;
  readonly repositoryMs?: number;
  readonly domainMs?: number;
  readonly totalMs?: number;
}

export interface BranchTelemetryEvent {
  readonly type: BranchTelemetryEventType;
  readonly method: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly correlationId?: string;
  readonly branchCount?: number;
  readonly timingMs?: BranchTelemetryTimingMs;
  readonly errorCode?: string;
}

export type BranchTelemetryHook = (event: BranchTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createBranchPipelineTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const buildBranchTelemetryTiming = (input: {
  readonly validationMs?: number;
  readonly repositoryMs?: number;
  readonly domainMs?: number;
  readonly totalMs?: number;
}): BranchTelemetryTimingMs => ({
  validationMs: input.validationMs,
  repositoryMs: input.repositoryMs,
  domainMs: input.domainMs,
  totalMs: input.totalMs,
});

export const emitBranchTelemetry = (
  hook: BranchTelemetryHook | undefined,
  event: BranchTelemetryEvent
): void => {
  hook?.(event);
};

export const createBranchTelemetryEmitter = (
  hook: BranchTelemetryHook | undefined,
  method: string,
  correlationId?: string
) => {
  const totalTimer = createBranchPipelineTimer();

  return {
    request: (partial: Omit<BranchTelemetryEvent, 'type' | 'method' | 'timingMs'> = {}) => {
      emitBranchTelemetry(hook, {
        type: 'BRANCH_SDK_REQUEST',
        method,
        correlationId,
        ...partial,
      });
    },
    success: (
      partial: Omit<BranchTelemetryEvent, 'type' | 'method' | 'timingMs'> & {
        timingMs?: BranchTelemetryTimingMs;
      } = {}
    ) => {
      emitBranchTelemetry(hook, {
        type: 'BRANCH_SDK_SUCCESS',
        method,
        correlationId,
        timingMs: partial.timingMs ?? buildBranchTelemetryTiming({ totalMs: totalTimer() }),
        ...partial,
      });
    },
    failure: (
      errorCode: string,
      partial: Omit<BranchTelemetryEvent, 'type' | 'method' | 'timingMs' | 'errorCode'> = {}
    ) => {
      emitBranchTelemetry(hook, {
        type: 'BRANCH_SDK_FAILURE',
        method,
        correlationId,
        errorCode,
        timingMs: buildBranchTelemetryTiming({ totalMs: totalTimer() }),
        ...partial,
      });
    },
    repositoryRead: (partial: Omit<BranchTelemetryEvent, 'type' | 'method'> = {}) => {
      emitBranchTelemetry(hook, {
        type: 'BRANCH_REPOSITORY_READ',
        method,
        correlationId,
        ...partial,
      });
    },
    domainEvaluation: (partial: Omit<BranchTelemetryEvent, 'type' | 'method'> = {}) => {
      emitBranchTelemetry(hook, {
        type: 'BRANCH_DOMAIN_EVALUATION',
        method,
        correlationId,
        ...partial,
      });
    },
  };
};
