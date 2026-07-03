/** Projection execution policy (M6 PR-6). Pure domain — no SDK imports. */

import type { ProjectionRuntimeExecutionRecord } from './ProjectionExecutionRecord';

export const DEFAULT_MAX_RUNTIME_RETRIES = 3 as const;

export function shouldRecordExecutionHistory(
  execution: ProjectionRuntimeExecutionRecord
): boolean {
  return execution.status === 'completed' || execution.status === 'failed';
}

export function shouldPersistSnapshot(processedEvents: number): boolean {
  return processedEvents > 0;
}

export function resolveExecutionFinalStatus(
  processedEvents: number,
  failedEvents: number,
  cancelled = false
): 'completed' | 'failed' {
  if (cancelled || failedEvents > 0) return 'failed';
  return 'completed';
}

export function shouldRetryRuntimeExecution(retryCount: number, maxRetries = DEFAULT_MAX_RUNTIME_RETRIES): boolean {
  return retryCount < maxRetries;
}
