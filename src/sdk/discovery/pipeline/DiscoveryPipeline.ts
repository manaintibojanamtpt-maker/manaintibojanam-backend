/**
 * DiscoverySDK — discovery pipeline orchestration (M3 PR-6).
 * Connects repository → eligibility → ranking → mapper. No new business rules.
 */

import { calculateDiscoveryDistanceKm } from '../../../domain/discovery/eligibility/DistanceCalculator';
import type { SdkAsyncResult, SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { DiscoveryQuery } from '../dto/candidates';
import type { DiscoveryCandidate } from '../dto/candidates';
import type { DiscoveryResult } from '../dto/results';
import type { EligibleCandidate } from '../dto/eligibleCandidate';
import type { EligibilityEngine } from '../eligibility/EligibilityEnginePort';
import type { RankingEngine } from '../ranking/RankingEngine';
import type { DiscoveryRepository } from '../repository/DiscoveryRepository';
import { discoveryNotConfigured } from '../adapters/notConfigured';
import { mapRankedCandidatesToDiscoveryResult } from './DiscoveryMapper';
import { createPipelineTimer, emitPipelineTrace } from './pipelineTelemetry';
import type {
  DiscoveryPipelineHooks,
  DiscoveryPipelineTelemetry,
  DiscoveryPipelineTimingMs,
  DiscoveryPipelineTrace,
} from './types';

const LAYER = 'DiscoveryPipeline';

export interface DiscoveryPipelineDeps {
  readonly query: DiscoveryQuery;
  readonly repository: DiscoveryRepository;
  readonly eligibilityEngine?: EligibilityEngine;
  readonly rankingEngine?: RankingEngine;
  readonly eligibilityEnabled: boolean;
  readonly useWeightedRanking: boolean;
  readonly hooks?: DiscoveryPipelineHooks;
}

const passthroughEligibleCandidates = (
  candidates: readonly DiscoveryCandidate[],
  query: DiscoveryQuery
): EligibleCandidate[] =>
  candidates.map((candidate) => {
    const distanceKm = calculateDiscoveryDistanceKm(query.customerPoint, candidate.point);
    return {
      candidate,
      isEligible: true,
      distanceKm,
      eligibility: {
        status: 'serviceable',
        isServiceable: true,
        distanceKm,
        maxRadiusKm: candidate.maxRadiusKm,
      },
      reasons: [],
    };
  });

const countEligible = (candidates: readonly EligibleCandidate[]): number =>
  candidates.filter((entry) => entry.isEligible).length;

const buildTelemetry = (
  counts: DiscoveryPipelineTelemetry['counts'],
  timingMs: DiscoveryPipelineTimingMs,
  traces: DiscoveryPipelineTrace[],
  flags: DiscoveryPipelineTelemetry['flags']
): DiscoveryPipelineTelemetry => ({
  counts,
  timingMs,
  traces,
  flags,
});

export async function runDiscoveryPipeline(
  deps: DiscoveryPipelineDeps
): Promise<SdkResult<DiscoveryResult>> {
  const totalTimer = createPipelineTimer();
  const traces: DiscoveryPipelineTrace[] = [];
  const flags = {
    eligibilityEnabled: deps.eligibilityEnabled,
    weightedRankingEnabled: deps.useWeightedRanking,
  };

  const recordStage = (trace: DiscoveryPipelineTrace) => {
    traces.push(trace);
    emitPipelineTrace(trace, deps.hooks);
  };

  if (!deps.rankingEngine) {
    return discoveryNotConfigured('discoverNearby', LAYER) as SdkResult<DiscoveryResult>;
  }

  if (deps.eligibilityEnabled && !deps.eligibilityEngine) {
    return discoveryNotConfigured('discoverNearby', LAYER) as SdkResult<DiscoveryResult>;
  }

  const repositoryQuery: DiscoveryQuery = {
    ...deps.query,
    limit: undefined,
  };

  const repositoryTimer = createPipelineTimer();
  const repositoryResult = await deps.repository.getDiscoveryCandidates(repositoryQuery);
  const repositoryMs = repositoryTimer();

  if (repositoryResult.ok === false) {
    return repositoryResult;
  }

  const repositoryCandidates = repositoryResult.value;
  recordStage({
    stage: 'repository',
    durationMs: repositoryMs,
    count: repositoryCandidates.length,
  });

  const eligibilityTimer = createPipelineTimer();
  let eligibleCandidates: EligibleCandidate[];

  if (deps.eligibilityEnabled) {
    const eligibilityResult = deps.eligibilityEngine!.evaluateCandidates(
      repositoryCandidates,
      deps.query.customerPoint
    );
    if (eligibilityResult.ok === false) {
      return eligibilityResult;
    }
    eligibleCandidates = eligibilityResult.value;
  } else {
    eligibleCandidates = passthroughEligibleCandidates(repositoryCandidates, deps.query);
  }

  const eligibilityMs = eligibilityTimer();
  const eligibleCount = countEligible(eligibleCandidates);
  recordStage({
    stage: 'eligibility',
    durationMs: eligibilityMs,
    count: eligibleCount,
  });

  const rankingTimer = createPipelineTimer();
  const rankingResult = deps.rankingEngine.rank(eligibleCandidates, {
    query: deps.query,
    useWeightedRanking: deps.useWeightedRanking,
  });
  const rankingMs = rankingTimer();

  if (rankingResult.ok === false) {
    return rankingResult;
  }

  const rankedCandidates = [...rankingResult.value];
  recordStage({
    stage: 'ranking',
    durationMs: rankingMs,
    count: rankedCandidates.length,
  });

  const mappingTimer = createPipelineTimer();
  const preliminaryTiming: DiscoveryPipelineTimingMs = {
    repository: repositoryMs,
    eligibility: eligibilityMs,
    ranking: rankingMs,
    mapping: 0,
    total: 0,
  };

  const preliminaryTelemetry = buildTelemetry(
    {
      repositoryCount: repositoryCandidates.length,
      eligibleCount,
      rankedCount: rankedCandidates.length,
      returnedCount: 0,
    },
    preliminaryTiming,
    traces,
    flags
  );

  const result = mapRankedCandidatesToDiscoveryResult(
    rankedCandidates,
    deps.query,
    repositoryCandidates.length,
    eligibleCount,
    preliminaryTelemetry
  );
  const mappingMs = mappingTimer();
  const totalMs = totalTimer();

  recordStage({
    stage: 'mapping',
    durationMs: mappingMs,
    count: result.restaurants.length,
  });
  recordStage({
    stage: 'total',
    durationMs: totalMs,
    count: result.restaurants.length,
  });

  const finalTiming: DiscoveryPipelineTimingMs = {
    repository: repositoryMs,
    eligibility: eligibilityMs,
    ranking: rankingMs,
    mapping: mappingMs,
    total: totalMs,
  };

  const finalTelemetry = buildTelemetry(
    {
      repositoryCount: repositoryCandidates.length,
      eligibleCount,
      rankedCount: rankedCandidates.length,
      returnedCount: result.restaurants.length,
    },
    finalTiming,
    traces,
    flags
  );

  return sdkOk({
    ...result,
    telemetry: finalTelemetry,
  });
}

export const runDiscoveryPipelineAsync = (
  deps: DiscoveryPipelineDeps
): SdkAsyncResult<DiscoveryResult> => runDiscoveryPipeline(deps);
