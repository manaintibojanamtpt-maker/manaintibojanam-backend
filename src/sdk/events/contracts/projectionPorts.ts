/**
 * EventSDK — projection worker ports (M6 PR-4).
 * Additive contracts — no changes to PR-1 ports.
 */

import type { EventEnvelope } from '../dto/EventEnvelope';
import type { EventTypeName } from '../types/branded';
import type { EventId } from '../types/branded';
import type { SdkAsyncResult } from '../../core/result';
import type { ProjectionIdentity, ProjectionRebuildRequest, ProjectionRebuildResult } from '../../../domain/events/projection/shared/ProjectionIdentityTypes';

export interface ProjectionHandlerContext {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly handlerVersion: string;
  readonly sequence?: number;
}

/** Generic projection handler — business handlers register later. */
export interface ProjectionHandlerPort {
  handle<TPayload>(
    envelope: EventEnvelope<TPayload>,
    context: ProjectionHandlerContext
  ): SdkAsyncResult<void>;
}

export interface ProjectionHandlerRegistration {
  readonly identity: ProjectionIdentity;
  readonly eventTypes: readonly EventTypeName[];
  readonly handlerVersion: string;
  readonly handler: ProjectionHandlerPort;
  /** @deprecated use identity.projectionName */
  readonly projectionName?: string;
  /** @deprecated use identity.consumerGroup */
  readonly consumerGroup?: string;
}

export interface ProjectionCheckpointRecord {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly eventId?: EventId;
  readonly sequence?: number;
  readonly timestamp: string;
  readonly schemaVersion: string;
  /** @deprecated use projectionVersion */
  readonly version?: string;
  /** @deprecated use eventId */
  readonly lastEventId?: EventId;
  /** @deprecated use sequence */
  readonly lastSequence?: number;
}

export interface CheckpointRepositoryPort {
  save(checkpoint: ProjectionCheckpointRecord): SdkAsyncResult<void>;
  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionCheckpointRecord | null>;
}

export interface ProjectionLeaseRecord {
  readonly projectionName: string;
  readonly holderId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export interface LeaseRepositoryPort {
  acquire(
    projectionName: string,
    holderId: string,
    ttlMs: number
  ): SdkAsyncResult<boolean>;
  renew(projectionName: string, holderId: string, ttlMs: number): SdkAsyncResult<boolean>;
  release(projectionName: string, holderId: string): SdkAsyncResult<void>;
}

export interface ProjectionExecutionRecord {
  readonly executionId: string;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly batchId?: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status: 'running' | 'completed' | 'failed';
  readonly processed: number;
  readonly failed: number;
}

export interface ProjectionRepositoryPort {
  saveExecution(execution: ProjectionExecutionRecord): SdkAsyncResult<void>;
  getExecution(executionId: string): SdkAsyncResult<ProjectionExecutionRecord | null>;
  listExecutions(projectionName: string, limit: number): SdkAsyncResult<ProjectionExecutionRecord[]>;
}

export interface ProjectionWorkerResult {
  readonly projectionName: string;
  readonly eventId: EventId;
  readonly processed: boolean;
  readonly skipped: boolean;
  readonly failed: boolean;
  readonly reason?: string;
}

export interface ProjectionWorkerPort {
  process<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<ProjectionWorkerResult>;
}

export interface ProjectionDispatchResult {
  readonly matchedHandlers: number;
  readonly invokedHandlers: number;
  readonly failedHandlers: number;
}

export interface ProjectionDispatcherPort {
  dispatch<TPayload>(
    envelope: EventEnvelope<TPayload>,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionDispatchResult>;
}

export interface ProjectionRegistryPort {
  register(registration: ProjectionHandlerRegistration): SdkAsyncResult<void>;
  unregister(projectionName: string, consumerGroup: string, projectionVersion?: string): SdkAsyncResult<void>;
  lookup(
    eventType: EventTypeName,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionHandlerRegistration[]>;
  list(projectionName?: string): SdkAsyncResult<ProjectionHandlerRegistration[]>;
  validate(registration: ProjectionHandlerRegistration): SdkAsyncResult<readonly string[]>;
}

export interface ProjectionRebuildPort {
  prepareRebuild(request: ProjectionRebuildRequest): SdkAsyncResult<ProjectionRebuildResult>;
  executeRebuild(rebuildId: string): SdkAsyncResult<ProjectionRebuildResult>;
  resumeRebuild(rebuildId: string): SdkAsyncResult<ProjectionRebuildResult>;
  cancelRebuild(rebuildId: string): SdkAsyncResult<ProjectionRebuildResult>;
}

export interface ProjectionRunRequest {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly holderId: string;
  readonly envelopes: readonly EventEnvelope[];
  readonly leaseTtlMs?: number;
}

export interface ProjectionRunResult {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly processed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly checkpoint?: ProjectionCheckpointRecord;
}

export interface ProjectionRunnerPort {
  run(request: ProjectionRunRequest): SdkAsyncResult<ProjectionRunResult>;
  pause(projectionName: string, consumerGroup: string): SdkAsyncResult<void>;
  resume(projectionName: string, consumerGroup: string): SdkAsyncResult<void>;
  cancel(projectionName: string, consumerGroup: string): SdkAsyncResult<void>;
}
