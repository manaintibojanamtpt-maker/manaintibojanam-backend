/**
 * EventSDK — projection runtime factory (M6 PR-6).
 */

import type { ProjectionRunnerPort } from '../../contracts/projectionPorts';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type {
  ProjectionRuntimePort,
  ProjectionCoordinatorPort,
  ProjectionPersistencePort,
} from '../../contracts/projectionRuntimePorts';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../../core/featureFlags';
import { createDefaultClock } from '../../providers/DefaultClock';
import { createDefaultUuid } from '../../providers/DefaultUuid';
import { createProjectionCheckpointPersistence } from './ProjectionCheckpointPersistence';
import { createProjectionSnapshotRepository } from './ProjectionSnapshotRepository';
import { createProjectionExecutionHistory } from './ProjectionExecutionHistory';
import { createProjectionStatisticsStore } from './InMemoryProjectionStatisticsStore';
import { createProjectionPersistence } from './ProjectionPersistenceAdapter';
import { createProjectionCoordinator } from './ProjectionCoordinator';
import {
  createProjectionRuntime,
  createStubProjectionRuntime,
  type ProjectionRuntimeOptions,
} from './ProjectionRuntime';
import type { ProjectionRuntimeTelemetryHook } from './ProjectionRuntimeTelemetry';

export interface ProjectionRuntimeInfrastructure {
  readonly runtime: ProjectionRuntimePort;
  readonly coordinator: ProjectionCoordinatorPort;
  readonly persistence: ProjectionPersistencePort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
}

export interface CreateProjectionRuntimeInfrastructureOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly runner: ProjectionRunnerPort;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: ProjectionRuntimeTelemetryHook;
}

function isRuntimeEnabled(readFlag: EventFeatureFlagReader): boolean {
  return (
    readFlag('FF_EVENT_PLATFORM_ENABLED') &&
    readFlag('FF_EVENT_PROJECTION_ENABLED') &&
    readFlag('FF_EVENT_PROJECTION_RUNTIME_ENABLED')
  );
}

export function createProjectionPersistenceBundle(): ProjectionPersistencePort {
  return createProjectionPersistence({
    checkpointPersistence: createProjectionCheckpointPersistence(),
    snapshotRepository: createProjectionSnapshotRepository(),
    executionHistory: createProjectionExecutionHistory(),
    statisticsStore: createProjectionStatisticsStore(),
  });
}

export function createProjectionRuntimeInfrastructure(
  options: CreateProjectionRuntimeInfrastructureOptions
): ProjectionRuntimeInfrastructure {
  const readFlag = options.featureFlags ?? readEventFlagDefault;
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const persistence = createProjectionPersistenceBundle();

  if (!isRuntimeEnabled(readFlag)) {
    return {
      runtime: createStubProjectionRuntime(),
      coordinator: {
        coordinateExecution: () =>
          Promise.resolve({
            ok: false,
            error: { code: 'NOT_CONFIGURED', message: 'ProjectionCoordinator not configured' },
          }),
      },
      persistence,
      clock,
      uuid,
    };
  }

  const coordinator = createProjectionCoordinator({
    runner: options.runner,
    persistence,
    clock,
    onTelemetry: options.onTelemetry,
  });

  const runtimeOptions: ProjectionRuntimeOptions = {
    featureFlags: readFlag,
    coordinator,
    persistence,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  };

  return {
    runtime: createProjectionRuntime(runtimeOptions),
    coordinator,
    persistence,
    clock,
    uuid,
  };
}

export {
  createProjectionRuntime,
  createProjectionCoordinator,
  createProjectionPersistence,
  createProjectionCheckpointPersistence,
  createProjectionSnapshotRepository,
  createProjectionExecutionHistory,
  createProjectionStatisticsStore,
};
