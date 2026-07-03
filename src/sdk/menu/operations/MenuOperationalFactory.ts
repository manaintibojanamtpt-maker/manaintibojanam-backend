/**
 * Menu operational infrastructure factory (M7 PR-10).
 */

import type {
  MenuOperationalSampleSourcePort,
  MenuOperationalRepositoryPort,
  MenuLagRepositoryPort,
  MenuHealthRepositoryPort,
  MenuOperationalInfrastructurePort,
} from './menuOperationalPorts';
import type { MenuFeatureFlagReader } from '../featureFlags/featureFlags';
import type { MenuOperationalThresholds } from '../../../domain/menu/operations/MenuOperationalThresholds';
import {
  createMenuOperationalValidator,
  createInMemoryMenuOperationalSampleSource,
  createInMemoryMenuOperationalRepository,
  createInMemoryMenuLagRepository,
  createInMemoryMenuHealthRepository,
  InMemoryMenuOperationalSampleSource,
  InMemoryMenuOperationalRepository,
  InMemoryMenuLagRepository,
  InMemoryMenuHealthRepository,
  type MenuOperationalValidator,
  type MenuOperationalClock,
  type MenuOperationalUuid,
} from './MenuOperationalValidator';
import type { MenuOperationalTelemetryHook } from './MenuOperationalTelemetry';

export interface MenuOperationalInfrastructure extends MenuOperationalInfrastructurePort {
  readonly validator: MenuOperationalValidator;
  readonly sampleSource: MenuOperationalSampleSourcePort;
  readonly operationalRepository: MenuOperationalRepositoryPort;
  readonly lagRepository: MenuLagRepositoryPort;
  readonly healthRepository: MenuHealthRepositoryPort;
}

export interface CreateMenuOperationalInfrastructureOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly sampleSource?: MenuOperationalSampleSourcePort;
  readonly operationalRepository?: MenuOperationalRepositoryPort;
  readonly lagRepository?: MenuLagRepositoryPort;
  readonly healthRepository?: MenuHealthRepositoryPort;
  readonly thresholds?: Partial<MenuOperationalThresholds>;
  readonly clock?: MenuOperationalClock;
  readonly uuid?: MenuOperationalUuid;
  readonly onTelemetry?: MenuOperationalTelemetryHook;
}

export function createMenuOperationalInfrastructure(
  options: CreateMenuOperationalInfrastructureOptions = {}
): MenuOperationalInfrastructure {
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const uuid = options.uuid ?? {
    generate: (() => {
      let counter = 0;
      return () => `menu-op-${++counter}`;
    })(),
  };
  const sampleSource = options.sampleSource ?? createInMemoryMenuOperationalSampleSource();
  const operationalRepository =
    options.operationalRepository ?? createInMemoryMenuOperationalRepository();
  const lagRepository = options.lagRepository ?? createInMemoryMenuLagRepository();
  const healthRepository = options.healthRepository ?? createInMemoryMenuHealthRepository();

  const validator = createMenuOperationalValidator({
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
  createMenuOperationalValidator,
  createInMemoryMenuOperationalSampleSource,
  createInMemoryMenuOperationalRepository,
  createInMemoryMenuLagRepository,
  createInMemoryMenuHealthRepository,
  InMemoryMenuOperationalSampleSource,
  InMemoryMenuOperationalRepository,
  InMemoryMenuLagRepository,
  InMemoryMenuHealthRepository,
};
