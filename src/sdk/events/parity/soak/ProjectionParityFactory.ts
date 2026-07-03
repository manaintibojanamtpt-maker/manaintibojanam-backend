/**
 * Projection parity soak factory (M6 PR-9).
 */

import type {
  ParitySoakReportSourcePort,
  ParityCertificationRepositoryPort,
  ProjectionParitySoakInfrastructurePort,
} from '../../contracts/paritySoakPorts';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { EventFeatureFlagReader } from '../../core/featureFlags';
import type { ParitySoakThresholds } from '../../../../domain/events/parity/soak/ParityThresholds';
import { createDefaultClock } from '../../providers/DefaultClock';
import { createDefaultUuid } from '../../providers/DefaultUuid';
import {
  createProjectionParitySoakRunner,
  createInMemoryParitySoakReportSource,
  InMemoryParitySoakReportSource,
  type ProjectionParitySoakRunner,
} from './ProjectionParitySoakRunner';
import {
  createProjectionParityAnalyzer,
  type ProjectionParityAnalyzer,
} from './ProjectionParityAnalyzer';
import {
  createProjectionParityCertificationRepository,
  type ProjectionParityCertificationRepository,
} from './ProjectionParityCertification';
import type { ProjectionParitySoakTelemetryHook } from './ProjectionParityTelemetry';

export interface ProjectionParitySoakInfrastructure extends ProjectionParitySoakInfrastructurePort {
  readonly runner: ProjectionParitySoakRunner;
  readonly analyzer: ProjectionParityAnalyzer;
  readonly reportSource: ParitySoakReportSourcePort;
  readonly certificationRepository: ParityCertificationRepositoryPort;
}

export interface CreateProjectionParitySoakInfrastructureOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly reportSource?: ParitySoakReportSourcePort;
  readonly certificationRepository?: ParityCertificationRepositoryPort;
  readonly thresholds?: Partial<ParitySoakThresholds>;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: ProjectionParitySoakTelemetryHook;
  readonly defaultLimit?: number;
}

export function createProjectionParitySoakInfrastructure(
  options: CreateProjectionParitySoakInfrastructureOptions = {}
): ProjectionParitySoakInfrastructure {
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const reportSource = options.reportSource ?? createInMemoryParitySoakReportSource();
  const certificationRepository =
    options.certificationRepository ?? createProjectionParityCertificationRepository();
  const analyzer = createProjectionParityAnalyzer({
    thresholds: options.thresholds,
    certificationIdFactory: () => uuid.generate(),
    clock,
  });
  const runner = createProjectionParitySoakRunner({
    featureFlags: options.featureFlags,
    reportSource,
    certificationRepository,
    analyzer,
    clock,
    onTelemetry: options.onTelemetry,
    defaultLimit: options.defaultLimit,
  });

  return {
    runner,
    analyzer,
    reportSource,
    certificationRepository,
    runSoak: (limit) => runner.runSoak(limit),
    analyze: (limit) => runner.analyze(limit),
    metrics: (limit) => runner.metricsOnly(limit),
  };
}

export {
  createProjectionParitySoakRunner,
  createProjectionParityAnalyzer,
  createProjectionParityCertificationRepository,
  createInMemoryParitySoakReportSource,
  InMemoryParitySoakReportSource,
};
