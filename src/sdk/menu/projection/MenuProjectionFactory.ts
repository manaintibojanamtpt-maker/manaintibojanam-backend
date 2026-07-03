/**
 * Menu projection factory (M7 PR-6).
 */

import {
  readMenuFlagDefault,
  type MenuFeatureFlagReader,
} from '../featureFlags/featureFlags';
import type { MenuProjectionCoordinatorPort } from './MenuProjectionPorts';
import {
  createMenuProjectionCoordinator as buildMenuProjectionCoordinator,
} from './MenuProjectionCoordinator';
import { createMenuProjectionCheckpointRepository } from './MenuProjectionCheckpointRepository';
import { createMenuProjectionRepository } from './MenuProjectionRepository';
import { createMenuProjectionSnapshotRepository } from './MenuProjectionSnapshotRepository';
import type { MenuProjectionTelemetryHook } from './MenuProjectionTelemetry';
import type {
  MenuProjectionCheckpointPort,
  MenuProjectionRepositoryPort,
  MenuProjectionSnapshotPort,
} from './MenuProjectionPorts';

export interface MenuProjectionInfrastructure {
  readonly repository: MenuProjectionRepositoryPort;
  readonly checkpointRepository: MenuProjectionCheckpointPort;
  readonly snapshotRepository: MenuProjectionSnapshotPort;
  readonly coordinator: MenuProjectionCoordinatorPort;
}

export interface CreateMenuProjectionInfrastructureOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly repository?: MenuProjectionRepositoryPort;
  readonly checkpointRepository?: MenuProjectionCheckpointPort;
  readonly snapshotRepository?: MenuProjectionSnapshotPort;
  readonly coordinator?: MenuProjectionCoordinatorPort;
  readonly onTelemetry?: MenuProjectionTelemetryHook;
}

const createStubCoordinator = (): MenuProjectionCoordinatorPort => ({
  coordinateExecution: () =>
    Promise.resolve({
      ok: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Menu projection infrastructure is not configured',
      },
    }),
});

export function isMenuProjectionEnabled(
  featureFlags: MenuFeatureFlagReader = readMenuFlagDefault
): boolean {
  return featureFlags('FF_MENU_PROJECTION_ENABLED');
}

export function createMenuProjectionCoordinator(
  options: CreateMenuProjectionInfrastructureOptions = {}
): MenuProjectionCoordinatorPort {
  if (options.coordinator) {
    return options.coordinator;
  }

  const readFlag = options.featureFlags ?? readMenuFlagDefault;
  if (!isMenuProjectionEnabled(readFlag)) {
    return createStubCoordinator();
  }

  return buildMenuProjectionCoordinator({
    repository: createMenuProjectionRepository(options.repository),
    checkpointRepository:
      options.checkpointRepository ?? createMenuProjectionCheckpointRepository(),
    snapshotRepository:
      options.snapshotRepository ?? createMenuProjectionSnapshotRepository(),
    onTelemetry: options.onTelemetry,
  });
}

export function createMenuProjectionInfrastructure(
  options: CreateMenuProjectionInfrastructureOptions = {}
): MenuProjectionInfrastructure {
  const repository = createMenuProjectionRepository(options.repository);
  const checkpointRepository =
    options.checkpointRepository ?? createMenuProjectionCheckpointRepository();
  const snapshotRepository =
    options.snapshotRepository ?? createMenuProjectionSnapshotRepository();
  const coordinator = createMenuProjectionCoordinator({
    ...options,
    repository,
    checkpointRepository,
    snapshotRepository,
  });

  return {
    repository,
    checkpointRepository,
    snapshotRepository,
    coordinator,
  };
}

export { createMenuProjectionRepository } from './MenuProjectionRepository';
export { createMenuProjectionCheckpointRepository } from './MenuProjectionCheckpointRepository';
export { createMenuProjectionSnapshotRepository } from './MenuProjectionSnapshotRepository';
