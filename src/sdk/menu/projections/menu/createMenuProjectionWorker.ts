/**
 * Menu catalog shadow projection worker factory (M7 PR-7).
 */

import type { MenuFeatureFlagReader } from '../../featureFlags/featureFlags';
import { createMenuProjectionRepository } from './MenuProjectionRepository';
import {
  createMenuProjectionSnapshotStore,
  type MenuCatalogProjectionSnapshotStore,
} from './MenuProjectionSnapshot';
import { createMenuProjectionWorker, MenuProjectionWorker } from './MenuProjectionWorker';
import type { MenuCatalogProjectionTelemetryHook } from './MenuProjectionTelemetry';
import type {
  MenuProjectionRepositoryPort,
  MenuProjectionWorkerPort,
} from './menuProjectionPorts';

export interface MenuProjectionSnapshotClock {
  now(): string;
}

export interface MenuProjectionSnapshotUuid {
  generate(): string;
}

export interface CreateMenuProjectionWorkerOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly repository?: MenuProjectionRepositoryPort;
  readonly clock?: MenuProjectionSnapshotClock;
  readonly uuid?: MenuProjectionSnapshotUuid;
  readonly onTelemetry?: MenuCatalogProjectionTelemetryHook;
}

const defaultClock = (): MenuProjectionSnapshotClock => ({
  now: () => new Date().toISOString(),
});

const defaultUuid = (): MenuProjectionSnapshotUuid => {
  let counter = 0;
  return {
    generate: () => `menu-catalog-snap-${++counter}`,
  };
};

export function createMenuProjectionWorkerBundle(
  options: CreateMenuProjectionWorkerOptions = {}
): {
  worker: MenuProjectionWorkerPort;
  repository: MenuProjectionRepositoryPort;
  snapshotStore: MenuCatalogProjectionSnapshotStore;
} {
  const clock = options.clock ?? defaultClock();
  const uuid = options.uuid ?? defaultUuid();
  const repository = options.repository ?? createMenuProjectionRepository();
  const snapshotStore = createMenuProjectionSnapshotStore({
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });

  const worker = createMenuProjectionWorker({
    featureFlags: options.featureFlags,
    repository,
    snapshotStore,
    snapshotBuilder: snapshotStore,
    onTelemetry: options.onTelemetry,
  });

  return { worker, repository, snapshotStore };
}

export {
  createMenuProjectionWorker,
  createMenuProjectionRepository,
  createMenuProjectionSnapshotStore,
};

export { MenuProjectionWorker };
