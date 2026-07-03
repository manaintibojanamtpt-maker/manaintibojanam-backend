/**
 * EventSDK — projection worker (M6 PR-4).
 * Receives EventEnvelope, validates, dispatches, checkpoints, telemetry, retry.
 */

import type {
  ProjectionWorkerPort,
  ProjectionWorkerResult,
  ProjectionDispatcherPort,
  CheckpointRepositoryPort,
  ProjectionCheckpointRecord,
} from '../contracts/projectionPorts';
import type { DeadLetterPort } from '../contracts/ports';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { validateEventEnvelope } from '../validation/validateEventEnvelope';
import { validateRequiredMetadata } from '../validation/validateRequiredMetadata';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { createProjectionTelemetryEmitter } from './ProjectionTelemetry';
import {
  buildProjectionFailure,
  shouldDeadLetterProjection,
  shouldRetryProjection,
} from '../../../domain/events/projection/ProjectionRetryPolicy';

export interface ProjectionWorkerOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly projectionVersion?: string;
  readonly handlerVersion: string;
  readonly schemaVersion?: string;
  readonly dispatcher: ProjectionDispatcherPort;
  readonly checkpointRepository: CheckpointRepositoryPort;
  readonly deadLetterPort?: DeadLetterPort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: ProjectionTelemetryHook;
}

export class ProjectionWorker implements ProjectionWorkerPort {
  private sequence = 0;
  private readonly attemptCounts = new Map<string, number>();

  constructor(private readonly options: ProjectionWorkerOptions) {}

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return readFlag('FF_EVENT_PLATFORM_ENABLED') && readFlag('FF_EVENT_PROJECTION_ENABLED');
  }

  async process<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<ProjectionWorkerResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('process', 'ProjectionWorker');
    }

    const telemetry = createProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'process',
      this.options.projectionName,
      this.options.consumerGroup
    );
    telemetry.projectionStarted(envelope.header.eventId, envelope.header.type);

    for (const validation of [
      validateEventEnvelope(envelope),
      validateRequiredMetadata(envelope),
    ]) {
      if (!validation.ok) {
        telemetry.projectionFailed(validation.error.code, envelope.header.eventId);
        return {
          ok: false,
          error: validation.error,
        };
      }
    }

    const dispatch = await this.options.dispatcher.dispatch(
      envelope,
      this.options.consumerGroup
    );

    if (!dispatch.ok) {
      telemetry.projectionFailed(dispatch.error.code, envelope.header.eventId);
      return this.handleFailure(envelope, dispatch.error.message, false);
    }

    if (dispatch.value.matchedHandlers === 0) {
      telemetry.projectionCompleted(envelope.header.eventId, 0);
      return sdkOk({
        projectionName: this.options.projectionName,
        eventId: envelope.header.eventId,
        processed: false,
        skipped: true,
        failed: false,
      });
    }

    if (dispatch.value.failedHandlers > 0) {
      telemetry.projectionFailed('HANDLER_FAILED', envelope.header.eventId);
      return this.handleFailure(envelope, 'One or more handlers failed', true);
    }

    this.sequence += 1;
    const projectionVersion = this.options.projectionVersion ?? this.options.handlerVersion;
    const schemaVersion = this.options.schemaVersion ?? envelope.header.version;
    const checkpoint: ProjectionCheckpointRecord = {
      projectionName: this.options.projectionName,
      projectionVersion,
      consumerGroup: this.options.consumerGroup,
      eventId: envelope.header.eventId,
      sequence: this.sequence,
      timestamp: this.options.clock.now(),
      schemaVersion,
      version: projectionVersion,
      lastEventId: envelope.header.eventId,
      lastSequence: this.sequence,
    };
    await this.options.checkpointRepository.save(checkpoint);
    this.attemptCounts.delete(envelope.header.eventId);

    telemetry.projectionCompleted(envelope.header.eventId, dispatch.value.invokedHandlers);
    return sdkOk({
      projectionName: this.options.projectionName,
      eventId: envelope.header.eventId,
      processed: true,
      skipped: false,
      failed: false,
    });
  }

  private async handleFailure<TPayload>(
    envelope: EventEnvelope<TPayload>,
    reason: string,
    retryable: boolean
  ): SdkAsyncResult<ProjectionWorkerResult> {
    const eventId = envelope.header.eventId;
    const attemptCount = (this.attemptCounts.get(eventId) ?? 0) + 1;
    this.attemptCounts.set(eventId, attemptCount);

    const failure = buildProjectionFailure(
      eventId,
      envelope.header.type,
      reason,
      attemptCount,
      retryable
    );

    if (
      shouldDeadLetterProjection(attemptCount, failure) &&
      this.options.deadLetterPort
    ) {
      await this.options.deadLetterPort.record({
        eventId: envelope.header.eventId,
        type: envelope.header.type,
        envelope,
        consumerGroup: this.options.consumerGroup,
        reason,
        attemptCount,
      });
    }

    const willRetry = shouldRetryProjection(attemptCount, failure);

    return sdkOk({
      projectionName: this.options.projectionName,
      eventId,
      processed: false,
      skipped: false,
      failed: true,
      reason: willRetry ? `retry_pending:${reason}` : reason,
    });
  }
}

export function createProjectionWorker(options: ProjectionWorkerOptions): ProjectionWorkerPort {
  return new ProjectionWorker(options);
}
