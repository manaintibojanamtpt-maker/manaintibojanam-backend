/**
 * DiscoverySDK — pipeline timing helpers (M3 PR-6).
 */

import type { DiscoveryPipelineTrace } from './types';

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export const createPipelineTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, pipelineNow() - start);
};

export const emitPipelineTrace = (
  trace: DiscoveryPipelineTrace,
  hooks?: { readonly onStageComplete?: (event: DiscoveryPipelineTrace) => void }
): void => {
  hooks?.onStageComplete?.(trace);
};
