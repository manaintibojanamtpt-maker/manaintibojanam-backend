/**
 * EventSDK — projection infrastructure factory entry point (M6 PR-4).
 * Canonical factory module — re-exports ProjectionWorkerFactory.
 */

export {
  createProjectionInfrastructure,
  createProjectionRegistry,
  createProjectionDispatcher,
  createProjectionWorker,
  createProjectionRunner,
  createProjectionRebuildEngine,
  createProjectionRegistryInstance,
  createProjectionDispatcherInstance,
} from './ProjectionWorkerFactory';

export type {
  ProjectionInfrastructure,
  CreateProjectionInfrastructureOptions,
} from './ProjectionWorkerFactory';
