/**
 * Pricing operational infrastructure factory (M8 PR-10).
 */

import type {
  PricingOperationalSampleSourcePort,
  PricingOperationalRepositoryPort,
  PricingLagRepositoryPort,
  PricingHealthRepositoryPort,
  PricingOperationalInfrastructurePort,
} from './pricingOperationalPorts';
import type { PricingFeatureFlagReader } from '../featureFlags/featureFlags';
import type { PricingOperationalThresholds } from '../../../domain/pricing/operations/PricingOperationalThresholds';
import {
  createPricingOperationalValidator,
  createInMemoryPricingOperationalSampleSource,
  createInMemoryPricingOperationalRepository,
  createInMemoryPricingLagRepository,
  createInMemoryPricingHealthRepository,
  InMemoryPricingOperationalSampleSource,
  InMemoryPricingOperationalRepository,
  InMemoryPricingLagRepository,
  InMemoryPricingHealthRepository,
  type PricingOperationalValidator,
  type PricingOperationalClock,
  type PricingOperationalUuid,
} from './PricingOperationalValidator';
import type { PricingOperationalTelemetryHook } from './PricingOperationalTelemetry';

export interface PricingOperationalInfrastructure extends PricingOperationalInfrastructurePort {
  readonly validator: PricingOperationalValidator;
  readonly sampleSource: PricingOperationalSampleSourcePort;
  readonly operationalRepository: PricingOperationalRepositoryPort;
  readonly lagRepository: PricingLagRepositoryPort;
  readonly healthRepository: PricingHealthRepositoryPort;
}

export interface CreatePricingOperationalInfrastructureOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly sampleSource?: PricingOperationalSampleSourcePort;
  readonly operationalRepository?: PricingOperationalRepositoryPort;
  readonly lagRepository?: PricingLagRepositoryPort;
  readonly healthRepository?: PricingHealthRepositoryPort;
  readonly thresholds?: Partial<PricingOperationalThresholds>;
  readonly clock?: PricingOperationalClock;
  readonly uuid?: PricingOperationalUuid;
  readonly onTelemetry?: PricingOperationalTelemetryHook;
}

export function createPricingOperationalInfrastructure(
  options: CreatePricingOperationalInfrastructureOptions = {}
): PricingOperationalInfrastructure {
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const uuid = options.uuid ?? {
    generate: (() => {
      let counter = 0;
      return () => `pricing-op-${++counter}`;
    })(),
  };
  const sampleSource = options.sampleSource ?? createInMemoryPricingOperationalSampleSource();
  const operationalRepository =
    options.operationalRepository ?? createInMemoryPricingOperationalRepository();
  const lagRepository = options.lagRepository ?? createInMemoryPricingLagRepository();
  const healthRepository = options.healthRepository ?? createInMemoryPricingHealthRepository();

  const validator = createPricingOperationalValidator({
    featureFlags: options.featureFlags,
    sampleSource,
    operationalRepository,
    lagRepository,
    healthRepository,
    thresholds: options.thresholds,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });

  return {
    validator,
    sampleSource,
    operationalRepository,
    lagRepository,
    healthRepository,
    validate: (projectionName, limit) => validator.validate(projectionName, limit),
    dashboard: (projectionName) => healthRepository.getLatest(projectionName),
  };
}

export {
  createPricingOperationalValidator,
  createInMemoryPricingOperationalSampleSource,
  createInMemoryPricingOperationalRepository,
  createInMemoryPricingLagRepository,
  createInMemoryPricingHealthRepository,
  InMemoryPricingOperationalSampleSource,
  InMemoryPricingOperationalRepository,
  InMemoryPricingLagRepository,
  InMemoryPricingHealthRepository,
};
