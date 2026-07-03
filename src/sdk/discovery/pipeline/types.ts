/**
 * DiscoverySDK — pipeline telemetry DTOs (M3 PR-6).
 */

export type DiscoveryPipelineStage =
  | 'repository'
  | 'eligibility'
  | 'ranking'
  | 'mapping'
  | 'total';

export interface DiscoveryPipelineCounts {
  readonly repositoryCount: number;
  readonly eligibleCount: number;
  readonly rankedCount: number;
  readonly returnedCount: number;
}

export interface DiscoveryPipelineTimingMs {
  readonly repository: number;
  readonly eligibility: number;
  readonly ranking: number;
  readonly mapping: number;
  readonly total: number;
}

export interface DiscoveryPipelineTrace {
  readonly stage: DiscoveryPipelineStage;
  readonly durationMs: number;
  readonly count?: number;
}

export interface DiscoveryPipelineFlags {
  readonly eligibilityEnabled: boolean;
  readonly weightedRankingEnabled: boolean;
}

export interface DiscoveryPipelineTelemetry {
  readonly counts: DiscoveryPipelineCounts;
  readonly timingMs: DiscoveryPipelineTimingMs;
  readonly traces: readonly DiscoveryPipelineTrace[];
  readonly flags: DiscoveryPipelineFlags;
}

export interface DiscoveryPipelineHooks {
  readonly onStageComplete?: (trace: DiscoveryPipelineTrace) => void;
}
