/** @deprecated PR-1 — re-exports from adapters (M6 PR-2) */
export {
  createDefaultReplayService as createReplayEngine,
  createReplayService,
  DefaultReplayService as DefaultReplayEngine,
} from '../adapters/DefaultReplayService';
export type { CreateDefaultReplayServiceOptions as CreateReplayEngineOptions } from '../adapters/DefaultReplayService';
