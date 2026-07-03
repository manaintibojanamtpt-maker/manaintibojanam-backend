/**
 * BranchSDK — operations orchestration telemetry (M5 PR-12).
 */

export type BranchOperationsTelemetryEventType =
  | 'BRANCH_OPERATIONS_REQUEST'
  | 'BRANCH_OPERATIONS_SUCCESS'
  | 'BRANCH_OPERATIONS_FAILURE'
  | 'BRANCH_OPERATIONS_REPOSITORY_READ'
  | 'BRANCH_OPERATIONS_DOMAIN_EVALUATION';

export interface BranchOperationsTelemetryTimingMs {
  readonly validationMs?: number;
  readonly repositoryMs?: number;
  readonly domainMs?: number;
  readonly totalMs?: number;
}

export interface BranchOperationsTelemetryEvent {
  readonly type: BranchOperationsTelemetryEventType;
  readonly method: string;
  readonly branchId?: string;
  readonly correlationId?: string;
  readonly timingMs?: BranchOperationsTelemetryTimingMs;
  readonly errorCode?: string;
}

export type BranchOperationsTelemetryHook = (event: BranchOperationsTelemetryEvent) => void;

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createBranchOperationsPipelineTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const buildBranchOperationsTelemetryTiming = (input: {
  readonly validationMs?: number;
  readonly repositoryMs?: number;
  readonly domainMs?: number;
  readonly totalMs?: number;
}): BranchOperationsTelemetryTimingMs => ({
  validationMs: input.validationMs,
  repositoryMs: input.repositoryMs,
  domainMs: input.domainMs,
  totalMs: input.totalMs,
});

const emit = (hook: BranchOperationsTelemetryHook | undefined, event: BranchOperationsTelemetryEvent): void => {
  hook?.(event);
};

export const createBranchOperationsTelemetryEmitter = (
  hook: BranchOperationsTelemetryHook | undefined,
  method: string,
  correlationId?: string
) => {
  const totalTimer = createBranchOperationsPipelineTimer();

  return {
    request: (
      partial: Omit<BranchOperationsTelemetryEvent, 'type' | 'method' | 'timingMs'> = {}
    ) => {
      emit(hook, {
        type: 'BRANCH_OPERATIONS_REQUEST',
        method,
        correlationId,
        ...partial,
      });
    },
    repositoryRead: (branchId: string, repositoryMs: number) => {
      emit(hook, {
        type: 'BRANCH_OPERATIONS_REPOSITORY_READ',
        method,
        branchId,
        correlationId,
        timingMs: buildBranchOperationsTelemetryTiming({ repositoryMs }),
      });
    },
    domainEvaluation: (branchId: string, domainMs: number) => {
      emit(hook, {
        type: 'BRANCH_OPERATIONS_DOMAIN_EVALUATION',
        method,
        branchId,
        correlationId,
        timingMs: buildBranchOperationsTelemetryTiming({ domainMs }),
      });
    },
    success: (
      partial: Omit<BranchOperationsTelemetryEvent, 'type' | 'method'> & {
        timingMs?: BranchOperationsTelemetryTimingMs;
      } = {}
    ) => {
      emit(hook, {
        type: 'BRANCH_OPERATIONS_SUCCESS',
        method,
        correlationId,
        timingMs: partial.timingMs ?? buildBranchOperationsTelemetryTiming({ totalMs: totalTimer() }),
        ...partial,
      });
    },
    failure: (
      errorCode: string,
      partial: Omit<BranchOperationsTelemetryEvent, 'type' | 'method' | 'errorCode' | 'timingMs'> = {}
    ) => {
      emit(hook, {
        type: 'BRANCH_OPERATIONS_FAILURE',
        method,
        correlationId,
        errorCode,
        timingMs: buildBranchOperationsTelemetryTiming({ totalMs: totalTimer() }),
        ...partial,
      });
    },
  };
};
