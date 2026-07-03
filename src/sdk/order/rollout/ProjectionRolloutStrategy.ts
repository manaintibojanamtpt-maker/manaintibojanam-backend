/**
 * Projection rollout strategy — deterministic percentage bucketing (M6 PR-12).
 */

import { evaluateRolloutRouting, type RolloutRoutingContext } from '../../../domain/order/rollout/RolloutPolicy';
import type { RolloutRoutingDecision } from '../../../domain/order/rollout/RolloutDecision';

export class ProjectionRolloutStrategy {
  route(context: RolloutRoutingContext): RolloutRoutingDecision {
    return evaluateRolloutRouting(context);
  }
}

export function createProjectionRolloutStrategy(): ProjectionRolloutStrategy {
  return new ProjectionRolloutStrategy();
}
