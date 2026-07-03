/**
 * Order read projection worker factory (M6 PR-7).
 */

import type { ProjectionHandlerRegistration } from '../../contracts/projectionPorts';
import type { OrderProjectionRepositoryPort, OrderProjectionWorkerPort } from '../../contracts/orderProjectionPorts';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { EventFeatureFlagReader } from '../../core/featureFlags';
import { createDefaultClock } from '../../providers/DefaultClock';
import { createDefaultUuid } from '../../providers/DefaultUuid';
import { createOrderProjectionRepository } from './OrderProjectionRepository';
import {
  createOrderProjectionSnapshotStore,
  type OrderProjectionSnapshotStore,
} from './OrderProjectionSnapshot';
import { createOrderProjectionWorker, OrderProjectionWorker } from './OrderProjectionWorker';
import type { OrderProjectionTelemetryHook } from './OrderProjectionTelemetry';
import { asEventTypeName } from '../../types/branded';

export interface OrderProjectionWorkerBundle {
  readonly worker: OrderProjectionWorkerPort;
  readonly repository: OrderProjectionRepositoryPort;
  readonly snapshotStore: OrderProjectionSnapshotStore;
  readonly registration: ProjectionHandlerRegistration;
}

export interface CreateOrderProjectionWorkerOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly repository?: OrderProjectionRepositoryPort;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: OrderProjectionTelemetryHook;
}

export function createOrderProjectionWorkerBundle(
  options: CreateOrderProjectionWorkerOptions = {}
): OrderProjectionWorkerBundle {
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const repository = options.repository ?? createOrderProjectionRepository();
  const snapshotStore = createOrderProjectionSnapshotStore({
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });

  const worker = createOrderProjectionWorker({
    featureFlags: options.featureFlags,
    repository,
    snapshotStore,
    snapshotBuilder: snapshotStore,
    onTelemetry: options.onTelemetry,
  });

  const identity = OrderProjectionWorker.projectionIdentity();
  const registration: ProjectionHandlerRegistration = {
    identity,
    eventTypes: OrderProjectionWorker.supportedEventTypes().map(asEventTypeName),
    handlerVersion: identity.projectionVersion,
    handler: worker.asHandler(),
  };

  return { worker, repository, snapshotStore, registration };
}

export {
  createOrderProjectionWorker,
  createOrderProjectionRepository,
  createOrderProjectionSnapshotStore,
};
