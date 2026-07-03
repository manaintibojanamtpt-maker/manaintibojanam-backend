/**
 * Pricing projection rollout metrics (M8 PR-12).
 */

import type {
  PricingProjectionRolloutMetricsPort,
  PricingProjectionRolloutMetricsSnapshot,
} from './pricingProjectionRolloutPorts';
import type { RolloutHealthSnapshot } from '../../../domain/pricing/rollout/RolloutHealth';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class PricingProjectionRolloutMetrics implements PricingProjectionRolloutMetricsPort {
  private totalRequests = 0;
  private projectionRequests = 0;
  private fallbackCount = 0;
  private promotionCount = 0;
  private rollbackCount = 0;
  private health: RolloutHealthSnapshot;

  constructor(initialHealth?: RolloutHealthSnapshot) {
    this.health = initialHealth ?? {
      projectionReady: false,
      parityPercent: 0,
      operationalHealth: 'RED',
      projectionRepositoryHealthy: false,
      fallbackRatePercent: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      telemetryHealthScore: 0,
    };
  }

  setHealth(health: RolloutHealthSnapshot): void {
    this.health = health;
  }

  getSnapshot(): SdkAsyncResult<PricingProjectionRolloutMetricsSnapshot> {
    const fallbackRatePercent =
      this.totalRequests === 0
        ? 0
        : Math.round((this.fallbackCount / this.totalRequests) * 10000) / 100;

    const legacyRequests = this.totalRequests - this.projectionRequests;

    return Promise.resolve(
      sdkOk({
        health: {
          ...this.health,
          fallbackRatePercent,
        },
        totalRequests: this.totalRequests,
        projectionRequests: this.projectionRequests,
        legacyRequests,
        fallbackCount: this.fallbackCount,
        fallbackRatePercent,
        promotionCount: this.promotionCount,
        rollbackCount: this.rollbackCount,
        averageLatencyMs: this.health.averageLatencyMs,
        p95LatencyMs: this.health.p95LatencyMs,
        repositoryHealth: this.health.projectionRepositoryHealthy,
        operationalHealth: this.health.operationalHealth,
        parityPercent: this.health.parityPercent,
        capturedAt: new Date().toISOString(),
      })
    );
  }

  recordRequest(route: 'legacy' | 'projection', fallback: boolean): SdkAsyncResult<void> {
    this.totalRequests += 1;
    if (route === 'projection') this.projectionRequests += 1;
    if (fallback) {
      this.fallbackCount += 1;
      this.rollbackCount += 1;
    }
    return Promise.resolve(sdkOk(undefined));
  }

  recordPromotion(): SdkAsyncResult<void> {
    this.promotionCount += 1;
    return Promise.resolve(sdkOk(undefined));
  }
}

export function createPricingProjectionRolloutMetrics(
  initialHealth?: RolloutHealthSnapshot
): PricingProjectionRolloutMetrics {
  return new PricingProjectionRolloutMetrics(initialHealth);
}
