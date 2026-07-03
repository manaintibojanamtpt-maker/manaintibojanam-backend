/**
 * Projection rollout ports (M6 PR-12).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { RolloutHealthSnapshot } from '../../../domain/order/rollout/RolloutHealth';
import type {
  RolloutPromotionDecision,
  RolloutRollbackDecision,
  RolloutRoutingDecision,
} from '../../../domain/order/rollout/RolloutDecision';
import type { RolloutStageId } from '../../../domain/order/rollout/RolloutStage';

export interface ProjectionRolloutMetricsSnapshot {
  readonly health: RolloutHealthSnapshot;
  readonly totalRequests: number;
  readonly projectionRequests: number;
  readonly fallbackRequests: number;
  readonly fallbackRatePercent: number;
  readonly capturedAt: string;
}

export interface ProjectionRolloutMetricsPort {
  getSnapshot(): SdkAsyncResult<ProjectionRolloutMetricsSnapshot>;
  recordRequest(route: 'legacy' | 'projection', fallback: boolean): SdkAsyncResult<void>;
}

export interface ProjectionRolloutConfigurationState {
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly updatedAt: string;
}

export interface ProjectionRolloutPolicyPort {
  getConfiguration(): SdkAsyncResult<ProjectionRolloutConfigurationState>;
  setStage(stage: RolloutStageId, manualApprovalGranted: boolean): SdkAsyncResult<ProjectionRolloutConfigurationState>;
}

export interface ProjectionRolloutDecisionPort {
  evaluateRouting(routingKey: string): SdkAsyncResult<RolloutRoutingDecision>;
  evaluatePromotion(): SdkAsyncResult<RolloutPromotionDecision>;
  evaluateRollback(): SdkAsyncResult<RolloutRollbackDecision>;
  promote(): SdkAsyncResult<ProjectionRolloutConfigurationState>;
}
