/**
 * Projection operational infrastructure factory (M6 PR-10).
 */

import type {
  ProjectionOperationalSampleSourcePort,
  ProjectionOperationalRepositoryPort,
  ProjectionLagRepositoryPort,
  ProjectionHealthRepositoryPort,
  ProjectionOperationalInfrastructurePort,
} from '../contracts/projectionOperationalPorts';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { EventFeatureFlagReader } from '../core/featureFlags';
import type { ProjectionOperationalThresholds } from '../../../domain/events/operations/ProjectionOperationalThresholds';
import { createDefaultClock } from '../providers/DefaultClock';
import { createDefaultUuid } from '../providers/DefaultUuid';
import {
  createProjectionOperationalValidator,
  createInMemoryProjectionOperationalSampleSource,
  createInMemoryProjectionOperationalRepository,
  createInMemoryProjectionLagRepository,
  createInMemoryProjectionHealthRepository,
  InMemoryProjectionOperationalSampleSource,
  InMemoryProjectionOperationalRepository,
  InMemoryProjectionLagRepository,
  InMemoryProjectionHealthRepository,
  type ProjectionOperationalValidator,
} from './ProjectionOperationalValidator';
import type { ProjectionOperationalTelemetryHook } from './ProjectionOperationalTelemetry';

export interface ProjectionOperationalInfrastructure extends ProjectionOperationalInfrastructurePort {
  readonly validator: ProjectionOperationalValidator;
  readonly sampleSource: ProjectionOperationalSampleSourcePort;
  readonly operationalRepository: ProjectionOperationalRepositoryPort;
  readonly lagRepository: ProjectionLagRepositoryPort;
  readonly healthRepository: ProjectionHealthRepositoryPort;
}

export interface CreateProjectionOperationalInfrastructureOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly sampleSource?: ProjectionOperationalSampleSourcePort;
  readonly operationalRepository?: ProjectionOperationalRepositoryPort;
  readonly lagRepository?: ProjectionLagRepositoryPort;
  readonly healthRepository?: ProjectionHealthRepositoryPort;
  readonly thresholds?: Partial<ProjectionOperationalThresholds>;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: ProjectionOperationalTelemetryHook;
}

export function createProjectionOperationalInfrastructure(
  options: CreateProjectionOperationalInfrastructureOptions = {}
): ProjectionOperationalInfrastructure {
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const sampleSource = options.sampleSource ?? createInMemoryProjectionOperationalSampleSource();
  const operationalRepository =
    options.operationalRepository ?? createInMemoryProjectionOperationalRepository();
  const lagRepository = options.lagRepository ?? createInMemoryProjectionLagRepository();
  const healthRepository = options.healthRepository ?? createInMemoryProjectionHealthRepository();

  const validator = createProjectionOperationalValidator({
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
  createProjectionOperationalValidator,
  createInMemoryProjectionOperationalSampleSource,
  createInMemoryProjectionOperationalRepository,
  createInMemoryProjectionLagRepository,
  createInMemoryProjectionHealthRepository,
  InMemoryProjectionOperationalSampleSource,
  InMemoryProjectionOperationalRepository,
  InMemoryProjectionLagRepository,
  InMemoryProjectionHealthRepository,
};
