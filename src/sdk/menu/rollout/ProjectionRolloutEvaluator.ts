/**
 * Menu projection rollout evaluator (M7 PR-12).
 */

import type {
  MenuProjectionRolloutDecisionPort,
  MenuProjectionRolloutMetricsPort,
  MenuProjectionRolloutPolicyPort,
} from './projectionRolloutPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import {
  readMenuProjectionRolloutFlagDefault,
  type MenuProjectionRolloutFeatureFlagReader,
} from './rolloutFeatureFlags';
import {
  evaluateRolloutPromotion,
  evaluateRolloutRollback,
  type RolloutPolicyContext,
} from '../../../domain/menu/rollout/RolloutPolicy';
import type {
  RolloutPromotionDecision,
  RolloutRollbackDecision,
  RolloutRoutingDecision,
} from '../../../domain/menu/rollout/RolloutDecision';
import {
  createMenuProjectionRolloutStrategy,
  type MenuProjectionRolloutStrategy,
} from './ProjectionRolloutStrategy';
import type { MenuProjectionRolloutTelemetryHook } from './ProjectionRolloutTelemetry';
import { createMenuProjectionRolloutTelemetryEmitter } from './ProjectionRolloutTelemetry';
import type { MenuProjectionRolloutPolicy } from './ProjectionRolloutPolicy';

export interface MenuProjectionRolloutEvaluatorOptions {
  readonly featureFlags?: MenuProjectionRolloutFeatureFlagReader;
  readonly policy: MenuProjectionRolloutPolicyPort;
  readonly metrics: MenuProjectionRolloutMetricsPort;
  readonly strategy?: MenuProjectionRolloutStrategy;
  readonly onTelemetry?: MenuProjectionRolloutTelemetryHook;
}

export class MenuProjectionRolloutEvaluator implements MenuProjectionRolloutDecisionPort {
  private readonly strategy: MenuProjectionRolloutStrategy;

  constructor(private readonly options: MenuProjectionRolloutEvaluatorOptions) {
    this.strategy = options.strategy ?? createMenuProjectionRolloutStrategy();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readMenuProjectionRolloutFlagDefault;
    return readFlag('FF_MENU_PROJECTION_ROLLOUT_ENABLED');
  }

  private async buildPolicyContext(): Promise<RolloutPolicyContext> {
    const configResult = await this.options.policy.getConfiguration();
    const metricsResult = await this.options.metrics.getSnapshot();
    const config = configResult.ok
      ? configResult.value
      : { currentStage: 0 as const, manualApprovalGranted: false };
    const health = metricsResult.ok
      ? metricsResult.value.health
      : {
          projectionReady: false,
          parityPercent: 0,
          operationalHealth: 'RED' as const,
          projectionRepositoryHealthy: false,
          fallbackRatePercent: 0,
          averageLatencyMs: 0,
          p95LatencyMs: 0,
          telemetryHealthScore: 0,
        };

    const internalPolicy = this.options.policy as MenuProjectionRolloutPolicy;
    const thresholds = internalPolicy.getInternalConfiguration?.().thresholds;

    return {
      rolloutFlagEnabled: this.isEnabled(),
      currentStage: config.currentStage,
      manualApprovalGranted: config.manualApprovalGranted,
      health,
      thresholds,
    };
  }

  async evaluateRouting(routingKey: string): SdkAsyncResult<RolloutRoutingDecision> {
    const telemetry = createMenuProjectionRolloutTelemetryEmitter(
      this.options.onTelemetry,
      'evaluateRouting'
    );
    telemetry.rolloutStarted();

    const context = await this.buildPolicyContext();
    const decision = this.strategy.route({ ...context, routingKey });

    if (decision.rollback || decision.route === 'legacy') {
      await this.options.metrics.recordRequest('legacy', decision.rollback);
      if (decision.rollback) telemetry.rolloutFallback(decision.reason, decision.stage);
    } else {
      await this.options.metrics.recordRequest('projection', false);
    }

    telemetry.rolloutCompleted();
    return sdkOk(decision);
  }

  async evaluatePromotion(): SdkAsyncResult<RolloutPromotionDecision> {
    const telemetry = createMenuProjectionRolloutTelemetryEmitter(
      this.options.onTelemetry,
      'evaluatePromotion'
    );
    telemetry.rolloutStarted();

    const context = await this.buildPolicyContext();
    const decision = evaluateRolloutPromotion(context);

    if (!decision.allowed) {
      telemetry.rolloutBlocked(decision.reason, context.currentStage);
    }

    telemetry.rolloutCompleted();
    return sdkOk(decision);
  }

  async evaluateRollback(): SdkAsyncResult<RolloutRollbackDecision> {
    const context = await this.buildPolicyContext();
    const thresholds = context.thresholds;
    return sdkOk(evaluateRolloutRollback(context.health, thresholds));
  }

  async promote(): SdkAsyncResult<
    import('./projectionRolloutPorts').MenuProjectionRolloutConfigurationState
  > {
    const telemetry = createMenuProjectionRolloutTelemetryEmitter(
      this.options.onTelemetry,
      'promote'
    );
    telemetry.rolloutStarted();

    const promotion = await this.evaluatePromotion();
    if (!promotion.ok) return promotion;
    if (!promotion.value.allowed || promotion.value.toStage === null) {
      telemetry.rolloutBlocked(promotion.value.reason, promotion.value.fromStage);
      return sdkFail(sdkError('FORBIDDEN', promotion.value.reason));
    }

    const updated = await this.options.policy.setStage(promotion.value.toStage, false);
    if (updated.ok) {
      await this.options.metrics.recordPromotion();
      telemetry.rolloutPromoted(promotion.value.fromStage, promotion.value.toStage);
      telemetry.stageChanged(
        promotion.value.fromStage,
        promotion.value.toStage,
        'Manual promotion approved'
      );
    }
    telemetry.rolloutCompleted();
    return updated;
  }
}

export function createProjectionRolloutEvaluator(
  options: MenuProjectionRolloutEvaluatorOptions
): MenuProjectionRolloutEvaluator {
  return new MenuProjectionRolloutEvaluator(options);
}
