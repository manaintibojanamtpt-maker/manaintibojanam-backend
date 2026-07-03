/**
 * Pricing projection rollout strategy — deterministic percentage bucketing (M8 PR-12).
 */

import {
  evaluateRolloutRouting,
  type RolloutRoutingContext,
} from '../../../domain/pricing/rollout/RolloutPolicy';
import type { RolloutRoutingDecision } from '../../../domain/pricing/rollout/RolloutDecision';

export class PricingProjectionRolloutStrategy {
  route(context: RolloutRoutingContext): RolloutRoutingDecision {
    return evaluateRolloutRouting(context);
  }
}

export function createPricingProjectionRolloutStrategy(): PricingProjectionRolloutStrategy {
  return new PricingProjectionRolloutStrategy();
}
