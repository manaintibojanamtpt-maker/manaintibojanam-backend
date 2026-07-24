import type { GoldenEvalReport } from './types.js';

let lastReport: GoldenEvalReport | null = null;
let lastAt: string | null = null;

/** Remember the latest golden run for Phase 25 promotion prechecks. */
export function recordLastGoldenEvalReport(report: GoldenEvalReport): void {
  lastReport = report;
  lastAt = new Date().toISOString();
}

export function getLastGoldenEvalReport(): {
  readonly report: GoldenEvalReport | null;
  readonly recordedAt: string | null;
} {
  return { report: lastReport, recordedAt: lastAt };
}

export function resetLastGoldenEvalReportForTests(): void {
  lastReport = null;
  lastAt = null;
}
