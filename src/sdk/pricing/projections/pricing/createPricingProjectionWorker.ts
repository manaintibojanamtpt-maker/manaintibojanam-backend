/**
 * Pricing catalog shadow projection worker factory (M8 PR-7).
 */

import type { PricingFeatureFlagReader } from '../../featureFlags/featureFlags';
import { createPricingCatalogProjectionRepository } from './PricingProjectionRepository';
import {
  createPricingProjectionSnapshotStore,
  type PricingCatalogProjectionSnapshotStore,
} from './PricingProjectionSnapshot';
import { createPricingProjectionWorker, PricingProjectionWorker } from './PricingProjectionWorker';
import type { PricingCatalogProjectionTelemetryHook } from './PricingProjectionTelemetry';
import type {
  PricingProjectionRepositoryPort,
  PricingProjectionWorkerPort,
} from './pricingProjectionPorts';

export interface PricingProjectionSnapshotClock {
  now(): string;
}

export interface PricingProjectionSnapshotUuid {
  generate(): string;
}

export interface CreatePricingProjectionWorkerOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly repository?: PricingProjectionRepositoryPort;
  readonly clock?: PricingProjectionSnapshotClock;
  readonly uuid?: PricingProjectionSnapshotUuid;
  readonly onTelemetry?: PricingCatalogProjectionTelemetryHook;
}

const defaultClock = (): PricingProjectionSnapshotClock => ({
  now: () => new Date().toISOString(),
});

const defaultUuid = (): PricingProjectionSnapshotUuid => {
  let counter = 0;
  return {
    generate: () => `pricing-catalog-snap-${++counter}`,
  };
};

export function createPricingProjectionWorkerBundle(
  options: CreatePricingProjectionWorkerOptions = {}
): {
  worker: PricingProjectionWorkerPort;
  repository: PricingProjectionRepositoryPort;
  snapshotStore: PricingCatalogProjectionSnapshotStore;
} {
  const clock = options.clock ?? defaultClock();
  const uuid = options.uuid ?? defaultUuid();
  const repository = options.repository ?? createPricingCatalogProjectionRepository();
  const snapshotStore = createPricingProjectionSnapshotStore({
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });

  const worker = createPricingProjectionWorker({
    featureFlags: options.featureFlags,
    repository,
    snapshotStore,
    snapshotBuilder: snapshotStore,
    onTelemetry: options.onTelemetry,
  });

  return { worker, repository, snapshotStore };
}

export {
  createPricingProjectionWorker,
  createPricingCatalogProjectionRepository,
  createPricingProjectionSnapshotStore,
};

export { PricingProjectionWorker };
