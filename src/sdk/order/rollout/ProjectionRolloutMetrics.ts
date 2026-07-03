/**
 * Projection rollout metrics (M6 PR-12).
 */

import type { ProjectionRolloutMetricsPort, ProjectionRolloutMetricsSnapshot } from './projectionRolloutPorts';
import type { RolloutHealthSnapshot } from '../../../domain/order/rollout/RolloutHealth';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class ProjectionRolloutMetrics implements ProjectionRolloutMetricsPort {
  private totalRequests = 0;
  private projectionRequests = 0;
  private fallbackRequests = 0;
  private health: RolloutHealthSnapshot;

  constructor(initialHealth?: RolloutHealthSnapshot) {
    this.health = initialHealth ?? {
      parityReady: false,
      parityPercent: 0,
      operationalHealth: 'RED',
      projectionRepositoryHealthy: false,
      fallbackRatePercent: 0,
      p95LatencyMs: 0,
      telemetryHealthScore: 0,
    };
  }

  setHealth(health: RolloutHealthSnapshot): void {
    this.health = health;
  }

  getSnapshot(): SdkAsyncResult<ProjectionRolloutMetricsSnapshot> {
    const fallbackRatePercent =
      this.totalRequests === 0
        ? 0
        : Math.round((this.fallbackRequests / this.totalRequests) * 10000) / 100;

    return Promise.resolve(
      sdkOk({
        health: {
          ...this.health,
          fallbackRatePercent,
        },
        totalRequests: this.totalRequests,
        projectionRequests: this.projectionRequests,
        fallbackRequests: this.fallbackRequests,
        fallbackRatePercent,
        capturedAt: new Date().toISOString(),
      })
    );
  }

  recordRequest(route: 'legacy' | 'projection', fallback: boolean): SdkAsyncResult<void> {
    this.totalRequests += 1;
    if (route === 'projection') this.projectionRequests += 1;
    if (fallback) this.fallbackRequests += 1;
    return Promise.resolve(sdkOk(undefined));
  }
}

export function createProjectionRolloutMetrics(
  initialHealth?: RolloutHealthSnapshot
): ProjectionRolloutMetrics {
  return new ProjectionRolloutMetrics(initialHealth);
}
