/**
 * Pricing projection validation (M8 PR-6).
 * Pure domain — no infrastructure imports.
 */

import type { PricingProjectionCheckpoint } from './PricingProjectionCheckpoint';
import type { PricingProjectionExecuteRequest } from './PricingProjectionExecution';
import type { PricingProjectionSnapshotMetadata } from './PricingProjectionSnapshot';

export function validatePricingProjectionCheckpoint(
  checkpoint: PricingProjectionCheckpoint
): readonly string[] {
  const errors: string[] = [];
  if (!checkpoint.projectionName) errors.push('projectionName is required');
  if (!checkpoint.projectionVersion) errors.push('projectionVersion is required');
  if (!checkpoint.consumerGroup) errors.push('consumerGroup is required');
  if (!checkpoint.schemaVersion) errors.push('schemaVersion is required');
  if (!checkpoint.updatedAt) errors.push('updatedAt is required');
  return errors;
}

export function validatePricingProjectionSnapshot(
  snapshot: PricingProjectionSnapshotMetadata
): readonly string[] {
  const errors: string[] = [];
  if (!snapshot.snapshotId) errors.push('snapshotId is required');
  if (!snapshot.projectionName) errors.push('projectionName is required');
  if (!snapshot.projectionVersion) errors.push('projectionVersion is required');
  if (!snapshot.checkpoint) errors.push('checkpoint is required');
  if (!snapshot.capturedAt) errors.push('capturedAt is required');
  return errors;
}

export function validatePricingProjectionExecuteRequest(
  request: PricingProjectionExecuteRequest
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

export function validatePricingProjectionExecutionRecord(record: {
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
