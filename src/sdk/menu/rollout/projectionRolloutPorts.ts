/**
 * Menu projection rollout ports (M7 PR-12).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { RolloutHealthSnapshot, RolloutOperationalHealth } from '../../../domain/menu/rollout/RolloutHealth';
import type {
  RolloutPromotionDecision,
  RolloutRollbackDecision,
  RolloutRoutingDecision,
} from '../../../domain/menu/rollout/RolloutDecision';
import type { RolloutStageId } from '../../../domain/menu/rollout/RolloutStage';

export interface MenuProjectionRolloutMetricsSnapshot {
  readonly health: RolloutHealthSnapshot;
  readonly totalRequests: number;
  readonly projectionRequests: number;
  readonly legacyRequests: number;
  readonly fallbackRequests: number;
  readonly fallbackRatePercent: number;
  readonly promotionCount: number;
  readonly rollbackCount: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly repositoryHealthy: boolean;
  readonly projectionHealth: RolloutOperationalHealth;
  readonly operationalHealth: RolloutOperationalHealth;
  readonly parityHealthPercent: number;
  readonly capturedAt: string;
}

export interface MenuProjectionRolloutMetricsPort {
  getSnapshot(): SdkAsyncResult<MenuProjectionRolloutMetricsSnapshot>;
  recordRequest(route: 'legacy' | 'projection', fallback: boolean): SdkAsyncResult<void>;
  recordPromotion(): SdkAsyncResult<void>;
}

export interface MenuProjectionRolloutConfigurationState {
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly updatedAt: string;
}

export interface MenuProjectionRolloutPolicyPort {
  getConfiguration(): SdkAsyncResult<MenuProjectionRolloutConfigurationState>;
  setStage(
    stage: RolloutStageId,
    manualApprovalGranted: boolean
  ): SdkAsyncResult<MenuProjectionRolloutConfigurationState>;
}

export interface MenuProjectionRolloutDecisionPort {
  evaluateRouting(routingKey: string): SdkAsyncResult<RolloutRoutingDecision>;
  evaluatePromotion(): SdkAsyncResult<RolloutPromotionDecision>;
  evaluateRollback(): SdkAsyncResult<RolloutRollbackDecision>;
  promote(): SdkAsyncResult<MenuProjectionRolloutConfigurationState>;
}
