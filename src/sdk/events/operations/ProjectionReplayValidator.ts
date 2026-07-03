/**
 * Projection replay validator (M6 PR-10).
 */

import {
  evaluateProjectionReplayHealth,
  type ProjectionReplayHealth,
} from '../../../domain/events/operations/ProjectionReplayHealth';
import type { ProjectionOperationalSample } from '../../../domain/events/operations/ProjectionOperationalRules';
import type { ProjectionOperationalThresholds } from '../../../domain/events/operations/ProjectionOperationalThresholds';
import { DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS } from '../../../domain/events/operations/ProjectionOperationalThresholds';

export class ProjectionReplayValidator {
  constructor(
    private readonly thresholds: ProjectionOperationalThresholds = DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS
  ) {}

  validate(sample: ProjectionOperationalSample): ProjectionReplayHealth {
    return evaluateProjectionReplayHealth(
      {
        projectionName: sample.projectionName,
        replayAttempts: sample.replayAttempts,
        replaySuccesses: sample.replaySuccesses,
      },
      this.thresholds.minReplaySuccessPercent
    );
  }
}

export function createProjectionReplayValidator(
  thresholds?: Partial<ProjectionOperationalThresholds>
): ProjectionReplayValidator {
  return new ProjectionReplayValidator({
    ...DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
