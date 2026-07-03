/**
 * Menu projection execution records (M7 PR-6).
 * Pure domain — no infrastructure imports.
 */

import type { MenuProjectionCheckpoint } from './MenuProjectionCheckpoint';
import type { MenuProjectionSnapshotMetadata } from './MenuProjectionSnapshot';

export type MenuProjectionExecutionStatus = 'running' | 'completed' | 'failed';

export interface MenuProjectionExecutionRecord {
  readonly executionId: string;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
  readonly status: MenuProjectionExecutionStatus;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly retryCount: number;
}

export interface MenuProjectionExecuteRequest {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly schemaVersion: string;
  readonly executionId: string;
  readonly eventId?: string;
  readonly sequence?: number;
  readonly processedEvents: number;
  readonly failedEvents: number;
}

export interface MenuProjectionExecuteResult {
  readonly executionId: string;
  readonly status: 'completed' | 'failed';
  readonly checkpoint?: MenuProjectionCheckpoint;
  readonly snapshot?: MenuProjectionSnapshotMetadata;
  readonly execution: MenuProjectionExecutionRecord;
}

export function startMenuProjectionExecution(
  executionId: string,
  projectionName: string,
  consumerGroup: string,
  startedAt: string
): MenuProjectionExecutionRecord {
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

export function completeMenuProjectionExecution(
  execution: MenuProjectionExecutionRecord,
  completedAt: string,
  processedEvents: number,
  failedEvents: number,
  status: 'completed' | 'failed' = 'completed'
): MenuProjectionExecutionRecord {
  const started = new Date(execution.startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  const durationMs =
    Number.isFinite(started) && Number.isFinite(completed)
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

export function resolveMenuProjectionFinalStatus(
  processedEvents: number,
  failedEvents: number
): 'completed' | 'failed' {
  if (failedEvents > 0) return 'failed';
  return 'completed';
}

export function shouldPersistMenuProjectionSnapshot(processedEvents: number): boolean {
  return processedEvents > 0;
}
