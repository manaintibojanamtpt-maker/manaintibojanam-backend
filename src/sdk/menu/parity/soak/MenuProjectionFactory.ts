/**
 * Menu projection soak factory (M7 PR-9).
 */

import type {
  MenuParityReportSourcePort,
  MenuProjectionCertificationRepositoryPort,
  MenuProjectionSoakInfrastructurePort,
} from './menuProjectionSoakPorts';
import type { MenuFeatureFlagReader } from '../../featureFlags/featureFlags';
import type { MenuProjectionSoakThresholds } from '../../../../domain/menu/parity/soak/MenuProjectionThresholds';
import {
  createMenuProjectionSoakRunner,
  createInMemoryMenuParityReportSource,
  InMemoryMenuParityReportSource,
  type MenuProjectionSoakRunner,
} from './MenuProjectionSoakRunner';
import { createMenuProjectionAnalyzer, type MenuProjectionAnalyzer } from './MenuProjectionAnalyzer';
import {
  createMenuProjectionCertificationRepository,
  type MenuProjectionCertificationRepository,
} from './MenuProjectionCertification';
import type { MenuProjectionSoakTelemetryHook } from './MenuProjectionTelemetry';

export interface MenuProjectionSoakInfrastructure extends MenuProjectionSoakInfrastructurePort {
  readonly runner: MenuProjectionSoakRunner;
  readonly analyzer: MenuProjectionAnalyzer;
  readonly reportSource: MenuParityReportSourcePort;
  readonly certificationRepository: MenuProjectionCertificationRepositoryPort;
}

export interface MenuProjectionSoakClock {
  now(): string;
}

export interface MenuProjectionSoakUuid {
  generate(): string;
}

export interface CreateMenuProjectionSoakInfrastructureOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly reportSource?: MenuParityReportSourcePort;
  readonly certificationRepository?: MenuProjectionCertificationRepositoryPort;
  readonly thresholds?: Partial<MenuProjectionSoakThresholds>;
  readonly clock?: MenuProjectionSoakClock;
  readonly uuid?: MenuProjectionSoakUuid;
  readonly onTelemetry?: MenuProjectionSoakTelemetryHook;
  readonly defaultLimit?: number;
}

export function createMenuProjectionSoakInfrastructure(
  options: CreateMenuProjectionSoakInfrastructureOptions = {}
): MenuProjectionSoakInfrastructure {
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const uuid = options.uuid ?? {
    generate: (() => {
      let counter = 0;
      return () => `menu-soak-${++counter}`;
    })(),
  };
  const reportSource = options.reportSource ?? createInMemoryMenuParityReportSource();
  const certificationRepository =
    options.certificationRepository ?? createMenuProjectionCertificationRepository();
  const analyzer = createMenuProjectionAnalyzer({
    thresholds: options.thresholds,
    certificationIdFactory: () => uuid.generate(),
    clock,
  });
  const runner = createMenuProjectionSoakRunner({
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
  createMenuProjectionSoakRunner,
  createMenuProjectionAnalyzer,
  createMenuProjectionCertificationRepository,
  createInMemoryMenuParityReportSource,
  InMemoryMenuParityReportSource,
};
