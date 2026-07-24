import type { ShadowCompareReport } from './aiShadowCompareReport.js';

let lastReport: ShadowCompareReport | null = null;
let lastAt: string | null = null;

/** Remember the latest ops shadow replay for Phase 25 promotion prechecks. */
export function recordLastShadowCompareReport(report: ShadowCompareReport): void {
  lastReport = report;
  lastAt = new Date().toISOString();
}

export function getLastShadowCompareReport(): {
  readonly report: ShadowCompareReport | null;
  readonly recordedAt: string | null;
} {
  return { report: lastReport, recordedAt: lastAt };
}

export function resetLastShadowCompareReportForTests(): void {
  lastReport = null;
  lastAt = null;
}
