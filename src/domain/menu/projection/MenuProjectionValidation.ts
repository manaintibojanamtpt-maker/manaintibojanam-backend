/**
 * Menu projection validation (M7 PR-6).
 * Pure domain — no infrastructure imports.
 */

import type { MenuProjectionCheckpoint } from './MenuProjectionCheckpoint';
import type { MenuProjectionExecuteRequest } from './MenuProjectionExecution';
import type { MenuProjectionSnapshotMetadata } from './MenuProjectionSnapshot';

export function validateMenuProjectionCheckpoint(
  checkpoint: MenuProjectionCheckpoint
): readonly string[] {
  const errors: string[] = [];
  if (!checkpoint.projectionName) errors.push('projectionName is required');
  if (!checkpoint.projectionVersion) errors.push('projectionVersion is required');
  if (!checkpoint.consumerGroup) errors.push('consumerGroup is required');
  if (!checkpoint.schemaVersion) errors.push('schemaVersion is required');
  if (!checkpoint.updatedAt) errors.push('updatedAt is required');
  return errors;
}

export function validateMenuProjectionSnapshot(
  snapshot: MenuProjectionSnapshotMetadata
): readonly string[] {
  const errors: string[] = [];
  if (!snapshot.snapshotId) errors.push('snapshotId is required');
  if (!snapshot.projectionName) errors.push('projectionName is required');
  if (!snapshot.projectionVersion) errors.push('projectionVersion is required');
  if (!snapshot.consumerGroup) errors.push('consumerGroup is required');
  if (!snapshot.schemaVersion) errors.push('schemaVersion is required');
  if (!snapshot.capturedAt) errors.push('capturedAt is required');
  return errors;
}

export function validateMenuProjectionExecuteRequest(
  request: MenuProjectionExecuteRequest
): readonly string[] {
  const errors: string[] = [];
  if (!request.projectionName) errors.push('projectionName is required');
  if (!request.projectionVersion) errors.push('projectionVersion is required');
  if (!request.consumerGroup) errors.push('consumerGroup is required');
  if (!request.schemaVersion) errors.push('schemaVersion is required');
  if (!request.executionId) errors.push('executionId is required');
  if (request.processedEvents < 0) errors.push('processedEvents must be >= 0');
  if (request.failedEvents < 0) errors.push('failedEvents must be >= 0');
  return errors;
}

export function validateMenuProjectionExecutionRecord(record: {
  executionId: string;
  projectionName: string;
  consumerGroup: string;
  startedAt: string;
  processedEvents: number;
  failedEvents: number;
  retryCount: number;
}): readonly string[] {
  const errors: string[] = [];
  if (!record.executionId) errors.push('executionId is required');
  if (!record.projectionName) errors.push('projectionName is required');
  if (!record.consumerGroup) errors.push('consumerGroup is required');
  if (!record.startedAt) errors.push('startedAt is required');
  if (record.processedEvents < 0) errors.push('processedEvents must be >= 0');
  if (record.failedEvents < 0) errors.push('failedEvents must be >= 0');
  if (record.retryCount < 0) errors.push('retryCount must be >= 0');
  return errors;
}
