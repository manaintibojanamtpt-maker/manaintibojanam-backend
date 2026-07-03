/**
 * Projection health monitor (M6 PR-10).
 */

import {
  buildProjectionOperationalMetrics,
  evaluateProjectionOperationalHealth,
  type ProjectionOperationalMetrics,
} from '../../../domain/events/operations/ProjectionOperationalRules';
import type { ProjectionOperationalHealth } from '../../../domain/events/operations/ProjectionHealth';
import type { ProjectionOperationalSample } from '../../../domain/events/operations/ProjectionOperationalRules';
import type { ProjectionOperationalThresholds } from '../../../domain/events/operations/ProjectionOperationalThresholds';
import { DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS } from '../../../domain/events/operations/ProjectionOperationalThresholds';

export class ProjectionHealthMonitor {
  constructor(
    private readonly thresholds: ProjectionOperationalThresholds = DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS
  ) {}

  metrics(sample: ProjectionOperationalSample): ProjectionOperationalMetrics {
    return buildProjectionOperationalMetrics(sample);
  }

  health(metrics: ProjectionOperationalMetrics, driftDetected: boolean): ProjectionOperationalHealth {
    return evaluateProjectionOperationalHealth(metrics, driftDetected, this.thresholds);
  }
}

export function createProjectionHealthMonitor(
  thresholds?: Partial<ProjectionOperationalThresholds>
): ProjectionHealthMonitor {
  return new ProjectionHealthMonitor({
    ...DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
