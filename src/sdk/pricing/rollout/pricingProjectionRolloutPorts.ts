/**
 * Pricing projection rollout ports (M8 PR-12).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { RolloutHealthSnapshot, RolloutOperationalHealth } from '../../../domain/pricing/rollout/RolloutHealth';
import type {
  RolloutPromotionDecision,
  RolloutRollbackDecision,
  RolloutRoutingDecision,
} from '../../../domain/pricing/rollout/RolloutDecision';
import type { RolloutStageId } from '../../../domain/pricing/rollout/RolloutStage';

export interface PricingProjectionRolloutMetricsSnapshot {
  readonly health: RolloutHealthSnapshot;
  readonly totalRequests: number;
  readonly projectionRequests: number;
  readonly legacyRequests: number;
  readonly fallbackCount: number;
  readonly fallbackRatePercent: number;
  readonly promotionCount: number;
  readonly rollbackCount: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly repositoryHealth: boolean;
  readonly operationalHealth: RolloutOperationalHealth;
  readonly parityPercent: number;
  readonly capturedAt: string;
}

export interface PricingProjectionRolloutMetricsPort {
  getSnapshot(): SdkAsyncResult<PricingProjectionRolloutMetricsSnapshot>;
  recordRequest(route: 'legacy' | 'projection', fallback: boolean): SdkAsyncResult<void>;
  recordPromotion(): SdkAsyncResult<void>;
}

export interface PricingProjectionRolloutConfigurationState {
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly updatedAt: string;
}

export interface PricingProjectionRolloutPolicyPort {
  getConfiguration(): SdkAsyncResult<PricingProjectionRolloutConfigurationState>;
  setStage(
    stage: RolloutStageId,
    manualApprovalGranted: boolean
  ): SdkAsyncResult<PricingProjectionRolloutConfigurationState>;
}

export interface PricingProjectionRolloutDecisionPort {
  evaluateRouting(routingKey: string): SdkAsyncResult<RolloutRoutingDecision>;
  evaluatePromotion(): SdkAsyncResult<RolloutPromotionDecision>;
  evaluateRollback(): SdkAsyncResult<RolloutRollbackDecision>;
  promote(): SdkAsyncResult<PricingProjectionRolloutConfigurationState>;
}
