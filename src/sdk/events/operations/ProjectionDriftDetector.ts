/**
 * Projection drift detector (M6 PR-10).
 */

import {
  detectProjectionDrift,
  type ProjectionDriftReport,
  type ProjectionDriftSample,
} from '../../../domain/events/operations/ProjectionDrift';
import type { ProjectionOperationalSample } from '../../../domain/events/operations/ProjectionOperationalRules';
import type { ProjectionOperationalThresholds } from '../../../domain/events/operations/ProjectionOperationalThresholds';
import { DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS } from '../../../domain/events/operations/ProjectionOperationalThresholds';

export class ProjectionDriftDetector {
  constructor(
    private readonly thresholds: ProjectionOperationalThresholds = DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS
  ) {}

  detect(sample: ProjectionOperationalSample): ProjectionDriftReport {
    const driftSample: ProjectionDriftSample = {
      projectionName: sample.projectionName,
      processedEvents: sample.processedEvents,
      duplicateEvents: sample.duplicateEvents,
      droppedEvents: sample.droppedEvents,
      missingEvents: sample.missingEvents,
      outOfOrderEvents: sample.outOfOrderEvents,
    };
    return detectProjectionDrift(
      driftSample,
      this.thresholds.maxDuplicatePercent,
      this.thresholds.maxDroppedEventPercent
    );
  }
}

export function createProjectionDriftDetector(
  thresholds?: Partial<ProjectionOperationalThresholds>
): ProjectionDriftDetector {
  return new ProjectionDriftDetector({
    ...DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
