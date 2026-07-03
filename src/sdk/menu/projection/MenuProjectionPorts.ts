/**
 * Menu projection ports (M7 PR-6).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { MenuProjectionCheckpoint } from '../../../domain/menu/projection/MenuProjectionCheckpoint';
import type {
  MenuProjectionExecuteRequest,
  MenuProjectionExecuteResult,
  MenuProjectionExecutionRecord,
} from '../../../domain/menu/projection/MenuProjectionExecution';
import type { MenuProjectionSnapshotMetadata } from '../../../domain/menu/projection/MenuProjectionSnapshot';

export interface MenuProjectionCheckpointPort {
  save(checkpoint: MenuProjectionCheckpoint): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<MenuProjectionCheckpoint | null>;
}

export interface MenuProjectionSnapshotPort {
  save(snapshot: MenuProjectionSnapshotMetadata): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<MenuProjectionSnapshotMetadata | null>;
  list(projectionName: string, limit: number): SdkAsyncResult<MenuProjectionSnapshotMetadata[]>;
}

export interface MenuProjectionRepositoryPort {
  saveExecution(record: MenuProjectionExecutionRecord): SdkAsyncResult<void>;
  getExecution(executionId: string): SdkAsyncResult<MenuProjectionExecutionRecord | null>;
  listExecutions(
    projectionName: string,
    limit: number
  ): SdkAsyncResult<MenuProjectionExecutionRecord[]>;
}

export interface MenuProjectionCoordinatorPort {
  coordinateExecution(
    request: MenuProjectionExecuteRequest
  ): SdkAsyncResult<MenuProjectionExecuteResult>;
}
