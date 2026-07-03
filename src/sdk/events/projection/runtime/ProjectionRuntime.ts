/**
 * EventSDK — projection runtime (M6 PR-6).
 * Generic infrastructure runtime — no business handlers.
 */

import type {
  ProjectionRuntimePort,
  ProjectionCoordinatorPort,
  ProjectionPersistencePort,
  ProjectionRuntimeExecuteRequest,
  ProjectionRuntimeExecuteResult,
} from '../../contracts/projectionRuntimePorts';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { SdkAsyncResult } from '../../../core/result';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../../core/featureFlags';
import { eventNotConfiguredAsync } from '../../adapters/notConfigured';
import type { ProjectionRuntimeTelemetryHook } from './ProjectionRuntimeTelemetry';

export interface ProjectionRuntimeOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly coordinator: ProjectionCoordinatorPort;
  readonly persistence: ProjectionPersistencePort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: ProjectionRuntimeTelemetryHook;
}

export class ProjectionRuntime implements ProjectionRuntimePort {
  constructor(private readonly options: ProjectionRuntimeOptions) {}

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_RUNTIME_ENABLED')
    );
  }

  async execute(
    request: ProjectionRuntimeExecuteRequest
  ): SdkAsyncResult<ProjectionRuntimeExecuteResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('execute', 'ProjectionRuntime');
    }

    const executionId = this.options.uuid.generate();
    return this.options.coordinator.coordinateExecution(request, executionId);
  }

  getStatistics(projectionName: string, consumerGroup: string) {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('getStatistics', 'ProjectionRuntime');
    }
    return this.options.persistence.getStatistics(projectionName, consumerGroup);
  }

  async getCheckpoint(projectionName: string, consumerGroup: string) {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('getCheckpoint', 'ProjectionRuntime');
    }
    return this.options.persistence.loadCheckpoint(projectionName, consumerGroup);
  }
}

export function createProjectionRuntime(options: ProjectionRuntimeOptions): ProjectionRuntimePort {
  return new ProjectionRuntime(options);
}

/** Stub runtime when flags OFF */
export function createStubProjectionRuntime(): ProjectionRuntimePort {
  return {
    execute: () => eventNotConfiguredAsync('execute', 'ProjectionRuntime'),
    getStatistics: () => eventNotConfiguredAsync('getStatistics', 'ProjectionRuntime'),
    getCheckpoint: () => eventNotConfiguredAsync('getCheckpoint', 'ProjectionRuntime'),
  };
}
