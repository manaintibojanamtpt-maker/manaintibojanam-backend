/**
 * Menu projection soak analyzer (M7 PR-9).
 */

import type { MenuParityReportRecord } from '../../../../domain/menu/parity/MenuParityResult';
import type { MenuProjectionSoakThresholds } from '../../../../domain/menu/parity/soak/MenuProjectionThresholds';
import { mergeMenuProjectionSoakThresholds } from '../../../../domain/menu/parity/soak/MenuProjectionThresholds';
import {
  buildMenuProjectionCertificationReport,
  type MenuProjectionCertificationReport,
} from '../../../../domain/menu/parity/soak/MenuProjectionCertificationRules';
import { createMenuProjectionMetrics, type MenuProjectionMetrics } from './MenuProjectionMetrics';

export interface MenuProjectionAnalyzerOptions {
  readonly metrics?: MenuProjectionMetrics;
  readonly thresholds?: Partial<MenuProjectionSoakThresholds>;
  readonly certificationIdFactory?: () => string;
  readonly clock?: { now: () => string };
}

export class MenuProjectionAnalyzer {
  private readonly metrics: MenuProjectionMetrics;
  private readonly thresholds: MenuProjectionSoakThresholds;
  private readonly certificationIdFactory: () => string;
  private readonly clock: { now: () => string };

  constructor(options: MenuProjectionAnalyzerOptions = {}) {
    this.metrics = options.metrics ?? createMenuProjectionMetrics();
    this.thresholds = mergeMenuProjectionSoakThresholds(options.thresholds);
    this.certificationIdFactory = options.certificationIdFactory ?? (() => `menu-cert-${Date.now()}`);
    this.clock = options.clock ?? { now: () => new Date().toISOString() };
  }

  analyze(reports: readonly MenuParityReportRecord[]): MenuProjectionCertificationReport {
    const input = this.metrics.buildInput(reports);
    return buildMenuProjectionCertificationReport(
      this.certificationIdFactory(),
      input,
      this.clock.now(),
      this.thresholds
    );
  }
}

export function createMenuProjectionAnalyzer(
  options?: MenuProjectionAnalyzerOptions
): MenuProjectionAnalyzer {
  return new MenuProjectionAnalyzer(options);
}
