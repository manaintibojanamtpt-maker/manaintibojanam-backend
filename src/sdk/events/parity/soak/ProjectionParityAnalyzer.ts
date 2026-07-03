/**
 * Projection parity analyzer (M6 PR-9).
 */

import type { OrderParityReportRecord } from '../../../../domain/events/parity/order/OrderParityResult';
import type { ParitySoakThresholds } from '../../../../domain/events/parity/soak/ParityThresholds';
import { mergeParitySoakThresholds } from '../../../../domain/events/parity/soak/ParityThresholds';
import {
  buildCertificationReport,
  type ParityCertificationReport,
} from '../../../../domain/events/parity/soak/ParityCertificationRules';
import { createProjectionParityMetrics, type ProjectionParityMetrics } from './ProjectionParityMetrics';

export interface ProjectionParityAnalyzerOptions {
  readonly metrics?: ProjectionParityMetrics;
  readonly thresholds?: Partial<ParitySoakThresholds>;
  readonly certificationIdFactory?: () => string;
  readonly clock?: { now: () => string };
}

export class ProjectionParityAnalyzer {
  private readonly metrics: ProjectionParityMetrics;
  private readonly thresholds: ParitySoakThresholds;
  private readonly certificationIdFactory: () => string;
  private readonly clock: { now: () => string };

  constructor(options: ProjectionParityAnalyzerOptions = {}) {
    this.metrics = options.metrics ?? createProjectionParityMetrics();
    this.thresholds = mergeParitySoakThresholds(options.thresholds);
    this.certificationIdFactory = options.certificationIdFactory ?? (() => `cert-${Date.now()}`);
    this.clock = options.clock ?? { now: () => new Date().toISOString() };
  }

  analyze(reports: readonly OrderParityReportRecord[]): ParityCertificationReport {
    const input = this.metrics.buildInput(reports);
    return buildCertificationReport(
      this.certificationIdFactory(),
      input,
      this.clock.now(),
      this.thresholds
    );
  }
}

export function createProjectionParityAnalyzer(
  options?: ProjectionParityAnalyzerOptions
): ProjectionParityAnalyzer {
  return new ProjectionParityAnalyzer(options);
}
