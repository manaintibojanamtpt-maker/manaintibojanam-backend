/**
 * Pricing projection soak factory (M8 PR-9).
 */

import type {
  PricingParityReportSourcePort,
  PricingProjectionCertificationRepositoryPort,
  PricingProjectionSoakInfrastructurePort,
} from './pricingProjectionSoakPorts';
import type { PricingFeatureFlagReader } from '../../featureFlags/featureFlags';
import type { PricingProjectionSoakThresholds } from '../../../../domain/pricing/parity/soak/PricingProjectionThresholds';
import {
  createPricingProjectionSoakRunner,
  createInMemoryPricingParityReportSource,
  InMemoryPricingParityReportSource,
  type PricingProjectionSoakRunner,
} from './PricingProjectionSoakRunner';
import {
  createPricingProjectionAnalyzer,
  type PricingProjectionAnalyzer,
} from './PricingProjectionAnalyzer';
import {
  createPricingProjectionCertificationRepository,
  type PricingProjectionCertificationRepository,
} from './PricingProjectionCertification';
import type { PricingProjectionSoakTelemetryHook } from './PricingProjectionTelemetry';

export interface PricingProjectionSoakInfrastructure extends PricingProjectionSoakInfrastructurePort {
  readonly runner: PricingProjectionSoakRunner;
  readonly analyzer: PricingProjectionAnalyzer;
  readonly reportSource: PricingParityReportSourcePort;
  readonly certificationRepository: PricingProjectionCertificationRepositoryPort;
}

export interface PricingProjectionSoakClock {
  now(): string;
}

export interface PricingProjectionSoakUuid {
  generate(): string;
}

export interface CreatePricingProjectionSoakInfrastructureOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly reportSource?: PricingParityReportSourcePort;
  readonly certificationRepository?: PricingProjectionCertificationRepositoryPort;
  readonly thresholds?: Partial<PricingProjectionSoakThresholds>;
  readonly clock?: PricingProjectionSoakClock;
  readonly uuid?: PricingProjectionSoakUuid;
  readonly onTelemetry?: PricingProjectionSoakTelemetryHook;
  readonly defaultLimit?: number;
}

export function createPricingProjectionSoakInfrastructure(
  options: CreatePricingProjectionSoakInfrastructureOptions = {}
): PricingProjectionSoakInfrastructure {
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const uuid = options.uuid ?? {
    generate: (() => {
      let counter = 0;
      return () => `pricing-soak-${++counter}`;
    })(),
  };
  const reportSource = options.reportSource ?? createInMemoryPricingParityReportSource();
  const certificationRepository =
    options.certificationRepository ?? createPricingProjectionCertificationRepository();
  const analyzer = createPricingProjectionAnalyzer({
    thresholds: options.thresholds,
    certificationIdFactory: () => uuid.generate(),
    clock,
  });
  const runner = createPricingProjectionSoakRunner({
    featureFlags: options.featureFlags,
    reportSource,
    certificationRepository,
    analyzer,
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
  createPricingProjectionSoakRunner,
  createPricingProjectionAnalyzer,
  createPricingProjectionCertificationRepository,
  createInMemoryPricingParityReportSource,
  InMemoryPricingParityReportSource,
};
