/**
 * SearchSDK — orchestration timing helpers (M4 PR-5).
 */

import type { SearchTimingMs } from '../dto/results';

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createSearchPipelineTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, Math.round(pipelineNow() - start));
};

export const buildSearchTiming = (input: {
  readonly normalizeMs?: number;
  readonly repositoryMs?: number;
  readonly discoveryMs?: number;
  readonly filterMs?: number;
  readonly totalMs?: number;
}): SearchTimingMs => ({
  normalizeMs: input.normalizeMs,
  repositoryMs: input.repositoryMs,
  discoveryMs: input.discoveryMs,
  filterMs: input.filterMs,
  totalMs: input.totalMs,
});
