/**
 * Projection rollout factory (M6 PR-12).
 */

import type {
  ProjectionRolloutDecisionPort,
  ProjectionRolloutMetricsPort,
  ProjectionRolloutPolicyPort,
} from './projectionRolloutPorts';
import type { ProjectionRolloutFeatureFlagReader } from './rolloutFeatureFlags';
import type { RolloutHealthSnapshot } from '../../../domain/order/rollout/RolloutHealth';
import type { ProjectionRolloutConfiguration } from './ProjectionRolloutConfiguration';
import {
  createProjectionRolloutPolicy,
  type ProjectionRolloutPolicy,
} from './ProjectionRolloutPolicy';
import {
  createProjectionRolloutMetrics,
  type ProjectionRolloutMetrics,
} from './ProjectionRolloutMetrics';
import {
  createProjectionRolloutEvaluator,
  type ProjectionRolloutEvaluator,
} from './ProjectionRolloutEvaluator';
import type { ProjectionRolloutTelemetryHook } from './ProjectionRolloutTelemetry';
import { createProjectionRolloutStrategy } from './ProjectionRolloutStrategy';

export interface ProjectionRolloutInfrastructure {
  readonly policy: ProjectionRolloutPolicy;
  readonly metrics: ProjectionRolloutMetrics;
  readonly evaluator: ProjectionRolloutEvaluator;
  readonly decision: ProjectionRolloutDecisionPort;
}

export interface CreateProjectionRolloutInfrastructureOptions {
  readonly featureFlags?: ProjectionRolloutFeatureFlagReader;
  readonly policy?: ProjectionRolloutPolicyPort;
  readonly metrics?: ProjectionRolloutMetricsPort;
  readonly initialHealth?: RolloutHealthSnapshot;
  readonly initialConfiguration?: Partial<ProjectionRolloutConfiguration>;
  readonly onTelemetry?: ProjectionRolloutTelemetryHook;
}

export function createProjectionRolloutInfrastructure(
  options: CreateProjectionRolloutInfrastructureOptions = {}
): ProjectionRolloutInfrastructure {
  const policy = (options.policy ??
    createProjectionRolloutPolicy(options.initialConfiguration)) as ProjectionRolloutPolicy;
  const metrics = (options.metrics ??
    createProjectionRolloutMetrics(options.initialHealth)) as ProjectionRolloutMetrics;
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

export {
  createProjectionRolloutPolicy,
  createProjectionRolloutMetrics,
  createProjectionRolloutEvaluator,
  createProjectionRolloutStrategy,
};
