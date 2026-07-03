/**
 * EventSDK — projection runner (M6 PR-4).
 * Orchestrates lease, checkpoint, worker batch processing.
 */

import type {
  ProjectionRunnerPort,
  ProjectionRunRequest,
  ProjectionRunResult,
  ProjectionWorkerPort,
  CheckpointRepositoryPort,
  LeaseRepositoryPort,
  ProjectionRepositoryPort,
  ProjectionCheckpointRecord,
} from '../contracts/projectionPorts';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { createProjectionTelemetryEmitter } from './ProjectionTelemetry';

export const DEFAULT_PROJECTION_LEASE_TTL_MS = 30_000 as const;

type RunnerControlState = 'running' | 'paused' | 'cancelled';

export interface ProjectionRunnerOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly worker: ProjectionWorkerPort;
  readonly checkpointRepository: CheckpointRepositoryPort;
  readonly leaseManager: LeaseRepositoryPort;
  readonly projectionRepository?: ProjectionRepositoryPort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: ProjectionTelemetryHook;
}

export class ProjectionRunner implements ProjectionRunnerPort {
  private readonly controlState = new Map<string, RunnerControlState>();

  constructor(private readonly options: ProjectionRunnerOptions) {}

  private controlKey(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return readFlag('FF_EVENT_PLATFORM_ENABLED') && readFlag('FF_EVENT_PROJECTION_ENABLED');
  }

  pause(projectionName: string, consumerGroup: string): SdkAsyncResult<void> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('pause', 'ProjectionRunner');
    }
    this.controlState.set(this.controlKey(projectionName, consumerGroup), 'paused');
    return Promise.resolve(sdkOk(undefined));
  }

  resume(projectionName: string, consumerGroup: string): SdkAsyncResult<void> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('resume', 'ProjectionRunner');
    }
    this.controlState.set(this.controlKey(projectionName, consumerGroup), 'running');
    return Promise.resolve(sdkOk(undefined));
  }

  cancel(projectionName: string, consumerGroup: string): SdkAsyncResult<void> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('cancel', 'ProjectionRunner');
    }
    this.controlState.set(this.controlKey(projectionName, consumerGroup), 'cancelled');
    return Promise.resolve(sdkOk(undefined));
  }

  async run(request: ProjectionRunRequest): SdkAsyncResult<ProjectionRunResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('run', 'ProjectionRunner');
    }

    const key = this.controlKey(request.projectionName, request.consumerGroup);
    const preState = this.controlState.get(key);
    if (preState === 'cancelled') {
      this.controlState.delete(key);
      return sdkOk({
        projectionName: request.projectionName,
        consumerGroup: request.consumerGroup,
        processed: 0,
        failed: 0,
        skipped: request.envelopes.length,
      });
    }
    if (preState !== 'paused') {
      this.controlState.set(key, 'running');
    }

    const telemetry = createProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'run',
      request.projectionName,
      request.consumerGroup
    );
    telemetry.projectionStarted();

    const leaseTtl = request.leaseTtlMs ?? DEFAULT_PROJECTION_LEASE_TTL_MS;
    const acquired = await this.options.leaseManager.acquire(
      request.projectionName,
      request.holderId,
      leaseTtl
    );
    if (!acquired.ok) return acquired;
    if (!acquired.value) {
      return eventNotConfiguredAsync('run', 'ProjectionRunner:lease_not_acquired');
    }
    telemetry.leaseAcquired();

    const executionId = this.options.uuid.generate();
    const startedAt = this.options.clock.now();

    if (this.options.projectionRepository) {
      await this.options.projectionRepository.saveExecution({
        executionId,
        projectionName: request.projectionName,
        consumerGroup: request.consumerGroup,
        startedAt,
        status: 'running',
        processed: 0,
        failed: 0,
      });
    }

    await this.options.checkpointRepository.load(
      request.projectionName,
      request.consumerGroup
    );

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    let lastCheckpoint: ProjectionCheckpointRecord | undefined;
    let cancelled = false;

    for (const envelope of request.envelopes) {
      const state = this.controlState.get(key) ?? 'running';
      if (state === 'cancelled') {
        cancelled = true;
        break;
      }
      if (state === 'paused') {
        skipped += 1;
        continue;
      }

      const result = await this.options.worker.process(envelope);
      if (!result.ok) {
        failed += 1;
        continue;
      }
      if (result.value.processed) processed += 1;
      else if (result.value.skipped) skipped += 1;
      else if (result.value.failed) failed += 1;

      const loaded = await this.options.checkpointRepository.load(
        request.projectionName,
        request.consumerGroup
      );
      if (loaded.ok && loaded.value) {
        lastCheckpoint = loaded.value;
      }
    }

    await this.options.leaseManager.release(request.projectionName, request.holderId);
    telemetry.leaseReleased();

    const completedAt = this.options.clock.now();
    const finalStatus = cancelled ? 'failed' : failed > 0 ? 'failed' : 'completed';
    if (this.options.projectionRepository) {
      await this.options.projectionRepository.saveExecution({
        executionId,
        projectionName: request.projectionName,
        consumerGroup: request.consumerGroup,
        startedAt,
        completedAt,
        status: finalStatus,
        processed,
        failed,
      });
    }

    telemetry.projectionCompleted(undefined, processed);
    this.controlState.delete(key);

    return sdkOk({
      projectionName: request.projectionName,
      consumerGroup: request.consumerGroup,
      processed,
      failed,
      skipped,
      checkpoint: lastCheckpoint,
    });
  }
}

export function createProjectionRunner(options: ProjectionRunnerOptions): ProjectionRunnerPort {
  return new ProjectionRunner(options);
}
