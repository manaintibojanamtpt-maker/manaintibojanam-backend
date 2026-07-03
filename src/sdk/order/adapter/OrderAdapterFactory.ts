/**
 * Order read adapter factory (M6 PR-11).
 */

import type {
  LegacyOrderRepositoryPort,
  ProjectionOrderRepositoryPort,
  OrderAdapterReadinessPort,
  OrderReadAdapterPort,
} from './orderAdapterPorts';
import type { OrderAdapterFeatureFlagReader } from './orderAdapterFeatureFlags';
import { createOrderReadAdapter, type OrderReadAdapter, type OrderReadAdapterOptions } from './OrderReadAdapter';
import { createOrderAdapterValidation } from './OrderAdapterValidation';
import { createLegacyOrderAdapter } from './LegacyOrderAdapter';
import { createProjectionOrderAdapter } from './ProjectionOrderAdapter';
import type { OrderAdapterTelemetryHook } from './OrderAdapterTelemetry';

export interface OrderReadAdapterInfrastructure {
  readonly adapter: OrderReadAdapterPort;
  readonly legacyRepository: LegacyOrderRepositoryPort;
  readonly projectionRepository: ProjectionOrderRepositoryPort;
}

export interface CreateOrderReadAdapterInfrastructureOptions {
  readonly featureFlags?: OrderAdapterFeatureFlagReader;
  readonly legacyRepository: LegacyOrderRepositoryPort;
  readonly projectionRepository: ProjectionOrderRepositoryPort;
  readonly readiness?: OrderAdapterReadinessPort;
  readonly onTelemetry?: OrderAdapterTelemetryHook;
}

export function createOrderReadAdapterInfrastructure(
  options: CreateOrderReadAdapterInfrastructureOptions
): OrderReadAdapterInfrastructure {
  const adapter = createOrderReadAdapter({
    featureFlags: options.featureFlags,
    legacyRepository: options.legacyRepository,
    projectionRepository: options.projectionRepository,
    readiness: options.readiness,
    onTelemetry: options.onTelemetry,
  });

  return {
    adapter,
    legacyRepository: options.legacyRepository,
    projectionRepository: options.projectionRepository,
  };
}

export {
  createOrderReadAdapter,
  createLegacyOrderAdapter,
  createProjectionOrderAdapter,
  createOrderAdapterValidation,
};

export type { OrderReadAdapterOptions };
