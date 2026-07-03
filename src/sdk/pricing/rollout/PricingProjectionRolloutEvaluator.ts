/**
 * Pricing projection rollout evaluator (M8 PR-12).
 */

import type {
  PricingProjectionRolloutDecisionPort,
  PricingProjectionRolloutMetricsPort,
  PricingProjectionRolloutPolicyPort,
} from './pricingProjectionRolloutPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import {
  readPricingProjectionRolloutFlagDefault,
  type PricingProjectionRolloutFeatureFlagReader,
} from './pricingRolloutFeatureFlags';
import {
  evaluateRolloutPromotion,
  evaluateRolloutRollback,
  type RolloutPolicyContext,
} from '../../../domain/pricing/rollout/RolloutPolicy';
import type {
  RolloutPromotionDecision,
  RolloutRollbackDecision,
  RolloutRoutingDecision,
} from '../../../domain/pricing/rollout/RolloutDecision';
import {
  createPricingProjectionRolloutStrategy,
  type PricingProjectionRolloutStrategy,
} from './PricingProjectionRolloutStrategy';
import type { PricingProjectionRolloutTelemetryHook } from './PricingProjectionRolloutTelemetry';
import { createPricingProjectionRolloutTelemetryEmitter } from './PricingProjectionRolloutTelemetry';
import type { PricingProjectionRolloutPolicy } from './PricingProjectionRolloutPolicy';

export interface PricingProjectionRolloutEvaluatorOptions {
  readonly featureFlags?: PricingProjectionRolloutFeatureFlagReader;
  readonly policy: PricingProjectionRolloutPolicyPort;
  readonly metrics: PricingProjectionRolloutMetricsPort;
  readonly strategy?: PricingProjectionRolloutStrategy;
  readonly onTelemetry?: PricingProjectionRolloutTelemetryHook;
}

export class PricingProjectionRolloutEvaluator implements PricingProjectionRolloutDecisionPort {
  private readonly strategy: PricingProjectionRolloutStrategy;

  constructor(private readonly options: PricingProjectionRolloutEvaluatorOptions) {
    this.strategy = options.strategy ?? createPricingProjectionRolloutStrategy();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readPricingProjectionRolloutFlagDefault;
    return readFlag('FF_PRICING_PROJECTION_ROLLOUT_ENABLED');
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

    const internalPolicy = this.options.policy as PricingProjectionRolloutPolicy;
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
    const telemetry = createPricingProjectionRolloutTelemetryEmitter(
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
    const telemetry = createPricingProjectionRolloutTelemetryEmitter(
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
    import('./pricingProjectionRolloutPorts').PricingProjectionRolloutConfigurationState
  > {
    const telemetry = createPricingProjectionRolloutTelemetryEmitter(
      this.options.onTelemetry,
      'promote'
    );
    telemetry.rolloutStarted();

    const promotion = await this.evaluatePromotion();
    if (!promotion.ok) {
      return promotion as import('../../core/result').SdkResult<
        import('./pricingProjectionRolloutPorts').PricingProjectionRolloutConfigurationState
      >;
    }
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

export function createPricingProjectionRolloutEvaluator(
  options: PricingProjectionRolloutEvaluatorOptions
): PricingProjectionRolloutEvaluator {
  return new PricingProjectionRolloutEvaluator(options);
}
