/**
 * Menu projection rollout metrics (M7 PR-12).
 */

import type {
  MenuProjectionRolloutMetricsPort,
  MenuProjectionRolloutMetricsSnapshot,
} from './projectionRolloutPorts';
import type { RolloutHealthSnapshot } from '../../../domain/menu/rollout/RolloutHealth';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class MenuProjectionRolloutMetrics implements MenuProjectionRolloutMetricsPort {
  private totalRequests = 0;
  private projectionRequests = 0;
  private fallbackRequests = 0;
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

  getSnapshot(): SdkAsyncResult<MenuProjectionRolloutMetricsSnapshot> {
    const fallbackRatePercent =
      this.totalRequests === 0
        ? 0
        : Math.round((this.fallbackRequests / this.totalRequests) * 10000) / 100;

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
        fallbackRequests: this.fallbackRequests,
        fallbackRatePercent,
        promotionCount: this.promotionCount,
        rollbackCount: this.rollbackCount,
        averageLatencyMs: this.health.averageLatencyMs,
        p95LatencyMs: this.health.p95LatencyMs,
        repositoryHealthy: this.health.projectionRepositoryHealthy,
        projectionHealth: this.health.operationalHealth,
        operationalHealth: this.health.operationalHealth,
        parityHealthPercent: this.health.parityPercent,
        capturedAt: new Date().toISOString(),
      })
    );
  }

  recordRequest(route: 'legacy' | 'projection', fallback: boolean): SdkAsyncResult<void> {
    this.totalRequests += 1;
    if (route === 'projection') this.projectionRequests += 1;
    if (fallback) {
      this.fallbackRequests += 1;
      this.rollbackCount += 1;
    }
    return Promise.resolve(sdkOk(undefined));
  }

  recordPromotion(): SdkAsyncResult<void> {
    this.promotionCount += 1;
    return Promise.resolve(sdkOk(undefined));
  }
}

export function createMenuProjectionRolloutMetrics(
  initialHealth?: RolloutHealthSnapshot
): MenuProjectionRolloutMetrics {
  return new MenuProjectionRolloutMetrics(initialHealth);
}
