/** Pricing rollout decision types (M8 PR-12). Pure domain — no SDK imports. */

import type { RolloutStageId } from './RolloutStage';

export type RolloutRoute = 'legacy' | 'projection';

export interface RolloutRoutingDecision {
  readonly route: RolloutRoute;
  readonly stage: RolloutStageId;
  readonly reason: string;
  readonly rollback: boolean;
  readonly bucket?: number;
}

export interface RolloutPromotionDecision {
  readonly allowed: boolean;
  readonly fromStage: RolloutStageId;
  readonly toStage: RolloutStageId | null;
  readonly reason: string;
  readonly blockers: readonly string[];
}

export interface RolloutRollbackDecision {
  readonly required: boolean;
  readonly reason: string;
  readonly triggeredBy: string;
}
