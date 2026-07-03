/**
 * Menu read adapter factory (M7 PR-11).
 */

import type {
  LegacyMenuReadPort,
  ProjectionMenuReadPort,
  MenuAdapterReadinessPort,
  MenuReadAdapterPort,
} from './menuAdapterPorts';
import type { MenuAdapterFeatureFlagReader } from './menuAdapterFeatureFlags';
import {
  createMenuReadAdapter,
  type MenuReadAdapter,
  type MenuReadAdapterOptions,
} from './MenuReadAdapter';
import { createMenuAdapterValidation } from './MenuAdapterValidation';
import { createLegacyMenuAdapter } from './LegacyMenuAdapter';
import { createProjectionMenuAdapter } from './ProjectionMenuAdapter';
import type { MenuAdapterTelemetryHook } from './MenuAdapterTelemetry';

export interface MenuReadAdapterInfrastructure {
  readonly adapter: MenuReadAdapterPort;
  readonly legacyRepository: LegacyMenuReadPort;
  readonly projectionRepository: ProjectionMenuReadPort;
}

export interface CreateMenuAdapterInfrastructureOptions {
  readonly featureFlags?: MenuAdapterFeatureFlagReader;
  readonly legacyRepository: LegacyMenuReadPort;
  readonly projectionRepository: ProjectionMenuReadPort;
  readonly readiness?: MenuAdapterReadinessPort;
  readonly onTelemetry?: MenuAdapterTelemetryHook;
}

export function createMenuAdapterInfrastructure(
  options: CreateMenuAdapterInfrastructureOptions
): MenuReadAdapterInfrastructure {
  const adapter = createMenuReadAdapter({
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
  createMenuReadAdapter,
  createLegacyMenuAdapter,
  createProjectionMenuAdapter,
  createMenuAdapterValidation,
};

export type { MenuReadAdapterOptions };
