/**
 * Pricing projection factory (M8 PR-6).
 */

import {
  readPricingFlagDefault,
  type PricingFeatureFlagReader,
} from '../featureFlags/featureFlags';
import type { PricingProjectionCoordinatorPort } from './PricingProjectionPorts';
import { createPricingProjectionCoordinator as buildPricingProjectionCoordinator } from './PricingProjectionCoordinator';
import { createPricingProjectionCheckpointRepository } from './PricingProjectionCheckpointRepository';
import { createPricingProjectionRepository } from './PricingProjectionRepository';
import { createPricingProjectionSnapshotRepository } from './PricingProjectionSnapshotRepository';
import type { PricingProjectionTelemetryHook } from './PricingProjectionTelemetry';
import type {
  PricingProjectionCheckpointPort,
  PricingProjectionRepositoryPort,
  PricingProjectionSnapshotPort,
} from './PricingProjectionPorts';

export interface PricingProjectionInfrastructure {
  readonly repository: PricingProjectionRepositoryPort;
  readonly checkpointRepository: PricingProjectionCheckpointPort;
  readonly snapshotRepository: PricingProjectionSnapshotPort;
  readonly coordinator: PricingProjectionCoordinatorPort;
}

export interface CreatePricingProjectionInfrastructureOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly repository?: PricingProjectionRepositoryPort;
  readonly checkpointRepository?: PricingProjectionCheckpointPort;
  readonly snapshotRepository?: PricingProjectionSnapshotPort;
  readonly coordinator?: PricingProjectionCoordinatorPort;
  readonly onTelemetry?: PricingProjectionTelemetryHook;
}

const createStubCoordinator = (): PricingProjectionCoordinatorPort => ({
  coordinateExecution: () =>
    Promise.resolve({
      ok: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Pricing projection infrastructure is not configured',
      },
    }),
});

export function isPricingProjectionEnabled(
  featureFlags: PricingFeatureFlagReader = readPricingFlagDefault
): boolean {
  return featureFlags('FF_PRICING_PROJECTION_ENABLED');
}

export function createPricingProjectionCoordinator(
  options: CreatePricingProjectionInfrastructureOptions = {}
): PricingProjectionCoordinatorPort {
  if (options.coordinator) {
    return options.coordinator;
  }

  const readFlag = options.featureFlags ?? readPricingFlagDefault;
  if (!isPricingProjectionEnabled(readFlag)) {
    return createStubCoordinator();
  }

  return buildPricingProjectionCoordinator({
    repository: createPricingProjectionRepository(options.repository),
    checkpointRepository:
      options.checkpointRepository ?? createPricingProjectionCheckpointRepository(),
    snapshotRepository:
      options.snapshotRepository ?? createPricingProjectionSnapshotRepository(),
    onTelemetry: options.onTelemetry,
  });
}

export function createPricingProjectionInfrastructure(
  options: CreatePricingProjectionInfrastructureOptions = {}
): PricingProjectionInfrastructure {
  const repository = createPricingProjectionRepository(options.repository);
  const checkpointRepository =
    options.checkpointRepository ?? createPricingProjectionCheckpointRepository();
  const snapshotRepository =
    options.snapshotRepository ?? createPricingProjectionSnapshotRepository();
  const coordinator = createPricingProjectionCoordinator({
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

export { createPricingProjectionRepository } from './PricingProjectionRepository';
export { createPricingProjectionCheckpointRepository } from './PricingProjectionCheckpointRepository';
export { createPricingProjectionSnapshotRepository } from './PricingProjectionSnapshotRepository';
