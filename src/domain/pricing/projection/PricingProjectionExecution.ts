/**
 * Pricing projection execution records (M8 PR-6).
 * Pure domain — no infrastructure imports.
 */

import type { PricingProjectionCheckpoint } from './PricingProjectionCheckpoint';
import type { PricingProjectionSnapshotMetadata } from './PricingProjectionSnapshot';

export type PricingProjectionExecutionStatus = 'running' | 'completed' | 'failed';

export interface PricingProjectionExecutionRecord {
  readonly executionId: string;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
  readonly status: PricingProjectionExecutionStatus;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly retryCount: number;
  readonly errors?: readonly string[];
}

export interface PricingProjectionExecuteRequest {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly schemaVersion: string;
  readonly executionId: string;
  readonly eventId?: string;
  readonly sequence?: number;
  readonly processedEvents: number;
  readonly failedEvents: number;
  readonly errors?: readonly string[];
}

export interface PricingProjectionExecuteResult {
  readonly executionId: string;
  readonly status: 'completed' | 'failed';
  readonly checkpoint?: PricingProjectionCheckpoint;
  readonly snapshot?: PricingProjectionSnapshotMetadata;
  readonly execution: PricingProjectionExecutionRecord;
}

export function startPricingProjectionExecution(
  executionId: string,
  projectionName: string,
  consumerGroup: string,
  startedAt: string
): PricingProjectionExecutionRecord {
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

export function completePricingProjectionExecution(
  execution: PricingProjectionExecutionRecord,
  completedAt: string,
  processedEvents: number,
  failedEvents: number,
  status: 'completed' | 'failed' = 'completed',
  errors?: readonly string[]
): PricingProjectionExecutionRecord {
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
    errors: errors?.length ? [...errors] : undefined,
  };
}

export function resolvePricingProjectionFinalStatus(
  processedEvents: number,
  failedEvents: number
): 'completed' | 'failed' {
  if (failedEvents > 0) return 'failed';
  return 'completed';
}

export function shouldPersistPricingProjectionSnapshot(processedEvents: number): boolean {
  return processedEvents > 0;
}
