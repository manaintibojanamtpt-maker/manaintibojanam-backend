/** Projection runtime execution record (M6 PR-6). Pure domain — no SDK imports. */

export type ProjectionRuntimeExecutionStatus = 'running' | 'completed' | 'failed';

export interface ProjectionRuntimeExecutionRecord {
  readonly executionId: string;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
  readonly status: ProjectionRuntimeExecutionStatus;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly retryCount: number;
}

export function startRuntimeExecution(
  executionId: string,
  projectionName: string,
  consumerGroup: string,
  startedAt: string
): ProjectionRuntimeExecutionRecord {
  return {
    executionId,
    projectionName,
    consumerGroup,
    startedAt,
    status: 'running',
    processedEvents: 0,
    failedEvents: 0,
    retryCount: 0,
  };
}

export function completeRuntimeExecution(
  execution: ProjectionRuntimeExecutionRecord,
  completedAt: string,
  processedEvents: number,
  failedEvents: number,
  status: 'completed' | 'failed' = 'completed'
): ProjectionRuntimeExecutionRecord {
  const started = new Date(execution.startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  const durationMs = Number.isFinite(started) && Number.isFinite(completed)
    ? Math.max(0, completed - started)
    : undefined;
  return {
    ...execution,
    completedAt,
    durationMs,
    status,
    processedEvents,
    failedEvents,
  };
}

export function incrementRuntimeRetry(
  execution: ProjectionRuntimeExecutionRecord
): ProjectionRuntimeExecutionRecord {
  return { ...execution, retryCount: execution.retryCount + 1 };
}
