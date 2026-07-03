/**
 * Projection lag analyzer (M6 PR-10).
 */

import {
  buildProjectionLagMetrics,
  type ProjectionLagMetrics,
  type ProjectionLagSample,
} from '../../../domain/events/operations/ProjectionLag';
import type { ProjectionOperationalSample } from '../../../domain/events/operations/ProjectionOperationalRules';

export class ProjectionLagAnalyzer {
  analyze(
    sample: ProjectionOperationalSample,
    historicalMaximumLagMs = 0
  ): ProjectionLagMetrics {
    const lagSample: ProjectionLagSample = {
      projectionName: sample.projectionName,
      lastEventProcessedAt: sample.lastEventProcessedAt,
      evaluatedAt: sample.evaluatedAt,
      checkpointUpdatedAt: sample.checkpointUpdatedAt,
    };
    return buildProjectionLagMetrics(lagSample, historicalMaximumLagMs);
  }
}

export function createProjectionLagAnalyzer(): ProjectionLagAnalyzer {
  return new ProjectionLagAnalyzer();
}
