/**
 * Pricing projection rollout factory (M8 PR-12).
 */

import type {
  PricingProjectionRolloutDecisionPort,
  PricingProjectionRolloutMetricsPort,
  PricingProjectionRolloutPolicyPort,
} from './pricingProjectionRolloutPorts';
import type { PricingProjectionRolloutFeatureFlagReader } from './pricingRolloutFeatureFlags';
import type { RolloutHealthSnapshot } from '../../../domain/pricing/rollout/RolloutHealth';
import type { PricingProjectionRolloutConfiguration } from './PricingProjectionRolloutConfiguration';
import {
  createPricingProjectionRolloutPolicy,
  type PricingProjectionRolloutPolicy,
} from './PricingProjectionRolloutPolicy';
import {
  createPricingProjectionRolloutMetrics,
  type PricingProjectionRolloutMetrics,
} from './PricingProjectionRolloutMetrics';
import {
  createPricingProjectionRolloutEvaluator,
  type PricingProjectionRolloutEvaluator,
} from './PricingProjectionRolloutEvaluator';
import type { PricingProjectionRolloutTelemetryHook } from './PricingProjectionRolloutTelemetry';
import { createPricingProjectionRolloutStrategy } from './PricingProjectionRolloutStrategy';

export interface PricingProjectionRolloutInfrastructure {
  readonly policy: PricingProjectionRolloutPolicy;
  readonly metrics: PricingProjectionRolloutMetrics;
  readonly evaluator: PricingProjectionRolloutEvaluator;
  readonly decision: PricingProjectionRolloutDecisionPort;
}

export interface CreatePricingProjectionRolloutInfrastructureOptions {
  readonly featureFlags?: PricingProjectionRolloutFeatureFlagReader;
  readonly policy?: PricingProjectionRolloutPolicyPort;
  readonly metrics?: PricingProjectionRolloutMetricsPort;
  readonly initialHealth?: RolloutHealthSnapshot;
  readonly initialConfiguration?: Partial<PricingProjectionRolloutConfiguration>;
  readonly onTelemetry?: PricingProjectionRolloutTelemetryHook;
}

export function createPricingProjectionRolloutInfrastructure(
  options: CreatePricingProjectionRolloutInfrastructureOptions = {}
): PricingProjectionRolloutInfrastructure {
  const policy = (options.policy ??
    createPricingProjectionRolloutPolicy(options.initialConfiguration)) as PricingProjectionRolloutPolicy;
  const metrics = (options.metrics ??
    createPricingProjectionRolloutMetrics(options.initialHealth)) as PricingProjectionRolloutMetrics;
  const evaluator = createPricingProjectionRolloutEvaluator({
    featureFlags: options.featureFlags,
    policy,
    metrics,
    onTelemetry: options.onTelemetry,
  });

  return {
    policy,
    metrics,
    evaluator,
    decision: evaluator,
  };
}

export function createPricingProjectionRollout(
  options: CreatePricingProjectionRolloutInfrastructureOptions = {}
): PricingProjectionRolloutInfrastructure {
  return createPricingProjectionRolloutInfrastructure(options);
}

export {
  createPricingProjectionRolloutPolicy,
  createPricingProjectionRolloutMetrics,
  createPricingProjectionRolloutEvaluator,
  createPricingProjectionRolloutStrategy,
};
