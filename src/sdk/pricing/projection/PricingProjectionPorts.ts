/**
 * Pricing projection ports (M8 PR-6).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { PricingProjectionCheckpoint } from '../../../domain/pricing/projection/PricingProjectionCheckpoint';
import type {
  PricingProjectionExecuteRequest,
  PricingProjectionExecuteResult,
  PricingProjectionExecutionRecord,
} from '../../../domain/pricing/projection/PricingProjectionExecution';
import type { PricingProjectionSnapshotMetadata } from '../../../domain/pricing/projection/PricingProjectionSnapshot';

export interface PricingProjectionCheckpointPort {
  save(checkpoint: PricingProjectionCheckpoint): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PricingProjectionCheckpoint | null>;
}

export interface PricingProjectionSnapshotPort {
  save(snapshot: PricingProjectionSnapshotMetadata): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PricingProjectionSnapshotMetadata | null>;
  list(projectionName: string, limit: number): SdkAsyncResult<PricingProjectionSnapshotMetadata[]>;
}

export interface PricingProjectionRepositoryPort {
  saveExecution(record: PricingProjectionExecutionRecord): SdkAsyncResult<void>;
  getExecution(executionId: string): SdkAsyncResult<PricingProjectionExecutionRecord | null>;
  listExecutions(
    projectionName: string,
    limit: number
  ): SdkAsyncResult<PricingProjectionExecutionRecord[]>;
}

export interface PricingProjectionCoordinatorPort {
  coordinateExecution(
    request: PricingProjectionExecuteRequest
  ): SdkAsyncResult<PricingProjectionExecuteResult>;
}
