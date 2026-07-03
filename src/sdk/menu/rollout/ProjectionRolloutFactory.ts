/**
 * Menu projection rollout factory (M7 PR-12).
 */

import type {
  MenuProjectionRolloutDecisionPort,
  MenuProjectionRolloutMetricsPort,
  MenuProjectionRolloutPolicyPort,
} from './projectionRolloutPorts';
import type { MenuProjectionRolloutFeatureFlagReader } from './rolloutFeatureFlags';
import type { RolloutHealthSnapshot } from '../../../domain/menu/rollout/RolloutHealth';
import type { MenuProjectionRolloutConfiguration } from './ProjectionRolloutConfiguration';
import {
  createProjectionRolloutPolicy,
  type MenuProjectionRolloutPolicy,
} from './ProjectionRolloutPolicy';
import {
  createMenuProjectionRolloutMetrics,
  type MenuProjectionRolloutMetrics,
} from './ProjectionRolloutMetrics';
import {
  createProjectionRolloutEvaluator,
  type MenuProjectionRolloutEvaluator,
} from './ProjectionRolloutEvaluator';
import type { MenuProjectionRolloutTelemetryHook } from './ProjectionRolloutTelemetry';
import { createMenuProjectionRolloutStrategy } from './ProjectionRolloutStrategy';

export interface MenuProjectionRolloutInfrastructure {
  readonly policy: MenuProjectionRolloutPolicy;
  readonly metrics: MenuProjectionRolloutMetrics;
  readonly evaluator: MenuProjectionRolloutEvaluator;
  readonly decision: MenuProjectionRolloutDecisionPort;
}

export interface CreateMenuProjectionRolloutInfrastructureOptions {
  readonly featureFlags?: MenuProjectionRolloutFeatureFlagReader;
  readonly policy?: MenuProjectionRolloutPolicyPort;
  readonly metrics?: MenuProjectionRolloutMetricsPort;
  readonly initialHealth?: RolloutHealthSnapshot;
  readonly initialConfiguration?: Partial<MenuProjectionRolloutConfiguration>;
  readonly onTelemetry?: MenuProjectionRolloutTelemetryHook;
}

export function createProjectionRolloutInfrastructure(
  options: CreateMenuProjectionRolloutInfrastructureOptions = {}
): MenuProjectionRolloutInfrastructure {
  const policy = (options.policy ??
    createProjectionRolloutPolicy(options.initialConfiguration)) as MenuProjectionRolloutPolicy;
  const metrics = (options.metrics ??
    createMenuProjectionRolloutMetrics(options.initialHealth)) as MenuProjectionRolloutMetrics;
  const evaluator = createProjectionRolloutEvaluator({
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

export function createMenuProjectionRollout(
  options: CreateMenuProjectionRolloutInfrastructureOptions = {}
): MenuProjectionRolloutInfrastructure {
  return createProjectionRolloutInfrastructure(options);
}

export {
  createProjectionRolloutPolicy,
  createMenuProjectionRolloutMetrics,
  createProjectionRolloutEvaluator,
  createMenuProjectionRolloutStrategy,
};
