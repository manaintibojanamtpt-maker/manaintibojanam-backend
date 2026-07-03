/**
 * Pricing read adapter factory (M8 PR-11).
 */

import type {
  LegacyPricingReadPort,
  ProjectionPricingReadPort,
  PricingAdapterReadinessPort,
  PricingReadAdapterPort,
} from './pricingAdapterPorts';
import type { PricingAdapterFeatureFlagReader } from './pricingAdapterFeatureFlags';
import {
  createPricingReadAdapter,
  type PricingReadAdapter,
  type PricingReadAdapterOptions,
} from './PricingReadAdapter';
import { createPricingAdapterValidation } from './PricingAdapterValidation';
import { createLegacyPricingAdapter } from './LegacyPricingAdapter';
import { createProjectionPricingAdapter } from './ProjectionPricingAdapter';
import type { PricingAdapterTelemetryHook } from './PricingAdapterTelemetry';

export interface PricingReadAdapterInfrastructure {
  readonly adapter: PricingReadAdapterPort;
  readonly legacyRepository: LegacyPricingReadPort;
  readonly projectionRepository: ProjectionPricingReadPort;
}

export interface CreatePricingAdapterInfrastructureOptions {
  readonly featureFlags?: PricingAdapterFeatureFlagReader;
  readonly legacyRepository: LegacyPricingReadPort;
  readonly projectionRepository: ProjectionPricingReadPort;
  readonly readiness?: PricingAdapterReadinessPort;
  readonly onTelemetry?: PricingAdapterTelemetryHook;
}

export function createPricingAdapterInfrastructure(
  options: CreatePricingAdapterInfrastructureOptions
): PricingReadAdapterInfrastructure {
  const adapter = createPricingReadAdapter({
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
  createPricingReadAdapter,
  createLegacyPricingAdapter,
  createProjectionPricingAdapter,
  createPricingAdapterValidation,
};

export type { PricingReadAdapterOptions };
