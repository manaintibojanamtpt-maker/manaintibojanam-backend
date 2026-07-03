/**
 * Menu projection rollout strategy — deterministic percentage bucketing (M7 PR-12).
 */

import {
  evaluateRolloutRouting,
  type RolloutRoutingContext,
} from '../../../domain/menu/rollout/RolloutPolicy';
import type { RolloutRoutingDecision } from '../../../domain/menu/rollout/RolloutDecision';

export class MenuProjectionRolloutStrategy {
  route(context: RolloutRoutingContext): RolloutRoutingDecision {
    return evaluateRolloutRouting(context);
  }
}

export function createMenuProjectionRolloutStrategy(): MenuProjectionRolloutStrategy {
  return new MenuProjectionRolloutStrategy();
}
