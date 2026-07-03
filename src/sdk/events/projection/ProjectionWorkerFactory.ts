/**
 * EventSDK — projection infrastructure factory (M6 PR-4).
 */

import type {
  ProjectionWorkerPort,
  ProjectionRegistryPort,
  ProjectionDispatcherPort,
  ProjectionRunnerPort,
  CheckpointRepositoryPort,
  LeaseRepositoryPort,
  ProjectionRepositoryPort,
  ProjectionHandlerRegistration,
  ProjectionRebuildPort,
} from '../contracts/projectionPorts';
import type { ClockPort, UuidPort, DeadLetterPort } from '../contracts/ports';
import type { SchemaRegistryPort } from '../contracts/ports';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { createDefaultClock } from '../providers/DefaultClock';
import { createDefaultUuid } from '../providers/DefaultUuid';
import { createProjectionRegistry } from './ProjectionRegistry';
import { createProjectionDispatcher } from './ProjectionDispatcher';
import { createProjectionCheckpointRepository } from './ProjectionCheckpointRepository';
import { createProjectionLeaseManager } from './ProjectionLeaseManager';
import { createInMemoryProjectionRepository } from './InMemoryProjectionRepository';
import { createProjectionWorker, type ProjectionWorkerOptions } from './ProjectionWorker';
import { createProjectionRunner } from './ProjectionRunner';
import { createStubProjectionWorker } from './StubProjectionWorker';
import { createProjectionRebuildEngine } from './ProjectionRebuildEngine';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';

export interface ProjectionInfrastructure {
  readonly registry: ProjectionRegistryPort;
  readonly dispatcher: ProjectionDispatcherPort;
  readonly checkpointRepository: CheckpointRepositoryPort;
  readonly leaseManager: LeaseRepositoryPort;
  readonly projectionRepository: ProjectionRepositoryPort;
  readonly worker: ProjectionWorkerPort;
  readonly runner: ProjectionRunnerPort;
  readonly rebuildEngine: ProjectionRebuildPort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
}

export interface CreateProjectionInfrastructureOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly projectionVersion?: string;
  readonly handlerVersion?: string;
  readonly schemaVersion?: string;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly schemaRegistry?: SchemaRegistryPort;
  readonly deadLetterPort?: DeadLetterPort;
  readonly onTelemetry?: ProjectionTelemetryHook;
  readonly registrations?: readonly ProjectionHandlerRegistration[];
}

function isProjectionEnabled(readFlag: EventFeatureFlagReader): boolean {
  return readFlag('FF_EVENT_PLATFORM_ENABLED') && readFlag('FF_EVENT_PROJECTION_ENABLED');
}

const stubRunner = (): ProjectionRunnerPort => ({
  run: () => eventNotConfiguredAsync('run', 'ProjectionRunner'),
  pause: () => eventNotConfiguredAsync('pause', 'ProjectionRunner'),
  resume: () => eventNotConfiguredAsync('resume', 'ProjectionRunner'),
  cancel: () => eventNotConfiguredAsync('cancel', 'ProjectionRunner'),
});

const stubRebuildEngine = (): ProjectionRebuildPort => ({
  prepareRebuild: () => eventNotConfiguredAsync('prepareRebuild', 'ProjectionRebuildEngine'),
  executeRebuild: () => eventNotConfiguredAsync('executeRebuild', 'ProjectionRebuildEngine'),
  resumeRebuild: () => eventNotConfiguredAsync('resumeRebuild', 'ProjectionRebuildEngine'),
  cancelRebuild: () => eventNotConfiguredAsync('cancelRebuild', 'ProjectionRebuildEngine'),
});

export function createProjectionRegistryInstance(
  options: { registrations?: readonly ProjectionHandlerRegistration[] } = {}
): ProjectionRegistryPort {
  const registry = createProjectionRegistry() as import('./ProjectionRegistry').ProjectionRegistry;
  for (const reg of options.registrations ?? []) {
    registry.bootstrap(reg);
  }
  return registry;
}

export function createProjectionDispatcherInstance(
  options: Pick<CreateProjectionInfrastructureOptions, 'schemaRegistry' | 'onTelemetry'> & {
    registry: ProjectionRegistryPort;
  }
): ProjectionDispatcherPort {
  return createProjectionDispatcher({
    registry: options.registry,
    schemaRegistry: options.schemaRegistry,
    onTelemetry: options.onTelemetry,
  });
}

export function createProjectionInfrastructure(
  options: CreateProjectionInfrastructureOptions
): ProjectionInfrastructure {
  const readFlag = options.featureFlags ?? readEventFlagDefault;
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();

  const registry = createProjectionRegistryInstance({ registrations: options.registrations });
  const checkpointRepository = createProjectionCheckpointRepository(options.onTelemetry);
  const leaseManager = createProjectionLeaseManager(clock, options.onTelemetry);
  const projectionRepository = createInMemoryProjectionRepository();

  if (!isProjectionEnabled(readFlag)) {
    return {
      registry,
      dispatcher: createProjectionDispatcher({ registry }),
      checkpointRepository,
      leaseManager,
      projectionRepository,
      worker: createStubProjectionWorker(),
      runner: stubRunner(),
      rebuildEngine: stubRebuildEngine(),
      clock,
      uuid,
    };
  }

  const dispatcher = createProjectionDispatcherInstance({
    registry,
    schemaRegistry: options.schemaRegistry,
    onTelemetry: options.onTelemetry,
  });

  const workerOptions: ProjectionWorkerOptions = {
    featureFlags: readFlag,
    projectionName: options.projectionName,
    consumerGroup: options.consumerGroup,
    projectionVersion: options.projectionVersion ?? options.handlerVersion ?? '1.0.0',
    handlerVersion: options.handlerVersion ?? '1.0.0',
    schemaVersion: options.schemaVersion,
    dispatcher,
    checkpointRepository,
    deadLetterPort: options.deadLetterPort,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  };

  const worker = createProjectionWorker(workerOptions);
  const runner = createProjectionRunner({
    featureFlags: readFlag,
    worker,
    checkpointRepository,
    leaseManager,
    projectionRepository,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });
  const rebuildEngine = createProjectionRebuildEngine({
    featureFlags: readFlag,
    clock,
    onTelemetry: options.onTelemetry,
  });

  return {
    registry,
    dispatcher,
    checkpointRepository,
    leaseManager,
    projectionRepository,
    worker,
    runner,
    rebuildEngine,
    clock,
    uuid,
  };
}

export {
  createProjectionRegistryInstance as createProjectionRegistry,
  createProjectionDispatcherInstance as createProjectionDispatcher,
  createProjectionWorker,
  createProjectionRunner,
  createProjectionRebuildEngine,
};
