/**
 * BranchSDK — automatic branch assignment engine (M5 PR-7).
 * BranchSDK is the ONLY platform permitted to choose fulfillment branches.
 */

import { calculateBranchScore } from '../../../domain/branch/scoring/BranchScoreCalculator';
import {
  selectBestEligibleBranch,
  validateBranchForAssignment,
} from '../../../domain/branch/validation/BranchValidation';
import type { BranchAssignmentPolicy } from '../../../domain/branch/assignment/BranchAssignmentPolicy';
import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import type { DiscoveryCandidate } from '../../discovery/dto/candidates';
import type { SdkAsyncResult } from '../../core/result';
import { isSdkSuccess, sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { BranchAssignment, BranchSelectionQuery } from '../dto';
import type { BranchAssignmentId, BranchId } from '../types/branded';
import { BRANCH_ERROR_MESSAGES } from '../errors/branchErrors';
import { validateBranchSelectionQuery } from '../validation/validateBranchQuery';
import type { BranchRepository } from '../repository/BranchRepository';
import { mapEligibilityToDto } from '../adapters/BranchDomainMapper';
import { mapRepositoryResultToSdk, repositoryUnavailable } from '../adapters/BranchErrorMapper';
import {
  buildCandidateSeedsFromBranchIds,
  buildCandidateSeedsFromDiscovery,
  loadOperationalSnapshots,
  resolveRepositoryBranchIds,
  type AssignmentCandidateSeed,
} from './AssignmentCandidateBuilder';
import {
  passesAssignmentScoreThreshold,
  resolveAssignmentPolicy,
  resolveAssignmentReason,
  shouldPreferBranch,
} from './AssignmentPolicyResolver';
import { mapDomainScoreToBranchScore } from './AssignmentScoreMapper';
import {
  createAssignmentTelemetryTimer,
  recordAssignmentFailure,
  recordAssignmentNoEligible,
  recordAssignmentPreferred,
  recordAssignmentRequest,
  recordAssignmentScoreRejected,
  recordAssignmentSuccess,
  type BranchAssignmentTelemetryHook,
} from './AssignmentTelemetry';

export interface BranchAssignmentEngineInput {
  readonly query: BranchSelectionQuery;
  readonly discoveryCandidates?: readonly DiscoveryCandidate[];
}

export interface BranchAssignmentResult {
  readonly assignment: BranchAssignment;
  readonly score: ReturnType<typeof mapDomainScoreToBranchScore>;
  readonly candidatesEvaluated: number;
  readonly eligibleCount: number;
  readonly rankedBranchIds: readonly BranchId[];
}

export interface DefaultBranchAssignmentEngineDeps {
  readonly repository: BranchRepository;
  readonly repositoryEnabled: boolean;
  readonly onTelemetry?: BranchAssignmentTelemetryHook;
}

const createSyntheticAssignmentId = (
  branchId: BranchId,
  assignedAt: number
): BranchAssignmentId => `assign-${branchId}-${assignedAt}` as BranchAssignmentId;

const countEligible = (
  snapshots: readonly BranchOperationalSnapshot[],
  context: { readonly orderType: BranchSelectionQuery['orderType']; readonly cartItemIds?: readonly string[] }
): number =>
  snapshots.filter(
    (snapshot) =>
      validateBranchForAssignment(snapshot, {
        orderType: context.orderType,
        cartItemIds: context.cartItemIds,
      }).isValid
  ).length;

const buildAssignment = (
  query: BranchSelectionQuery,
  snapshot: BranchOperationalSnapshot,
  validation: ReturnType<typeof validateBranchForAssignment>,
  score: ReturnType<typeof calculateBranchScore>,
  reason: BranchAssignment['reason'],
  assignedAt: number
): BranchAssignment => ({
  assignmentId: createSyntheticAssignmentId(snapshot.branchId as BranchId, assignedAt),
  tenantId: query.tenantId,
  branchId: snapshot.branchId as BranchId,
  branchName: snapshot.name,
  reason,
  score: mapDomainScoreToBranchScore(score),
  eligibility: mapEligibilityToDto(validation.eligibility),
  assignedAt,
  overrideApplied: false,
});

export class DefaultBranchAssignmentEngine {
  constructor(private readonly deps: DefaultBranchAssignmentEngineDeps) {}

  async assignBestBranch(
    input: BranchAssignmentEngineInput
  ): SdkAsyncResult<BranchAssignmentResult> {
    const timer = createAssignmentTelemetryTimer();
    const validated = validateBranchSelectionQuery(input.query);

    if (!isSdkSuccess(validated)) {
      recordAssignmentFailure(this.deps.onTelemetry, {
        tenantId: String(input.query.tenantId),
        correlationId: input.query.correlationId,
        errorCode: validated.error.code,
        durationMs: timer(),
      });
      return validated;
    }

    if (!this.deps.repositoryEnabled) {
      recordAssignmentFailure(this.deps.onTelemetry, {
        tenantId: String(input.query.tenantId),
        correlationId: input.query.correlationId,
        errorCode: 'REPOSITORY_UNAVAILABLE',
        durationMs: timer(),
      });
      return repositoryUnavailable('assignBestBranch');
    }

    const query = validated.value;
    const routingResult = mapRepositoryResultToSdk(
      await this.deps.repository.getRoutingPolicy(query.tenantId)
    );
    const policy = resolveAssignmentPolicy(routingResult.ok ? routingResult.value : undefined);

    const seeds = await this.resolveCandidateSeeds(query, input.discoveryCandidates);
    if (!isSdkSuccess(seeds)) {
      recordAssignmentFailure(this.deps.onTelemetry, {
        tenantId: String(query.tenantId),
        correlationId: query.correlationId,
        errorCode: seeds.error.code,
        durationMs: timer(),
      });
      return seeds;
    }

    recordAssignmentRequest(this.deps.onTelemetry, {
      tenantId: String(query.tenantId),
      correlationId: query.correlationId,
      candidateCount: seeds.value.length,
    });

    const snapshotsResult = await loadOperationalSnapshots(
      this.deps.repository,
      seeds.value,
      query.customerPoint
    );
    if (!isSdkSuccess(snapshotsResult)) {
      recordAssignmentFailure(this.deps.onTelemetry, {
        tenantId: String(query.tenantId),
        correlationId: query.correlationId,
        errorCode: snapshotsResult.error.code,
        durationMs: timer(),
      });
      return snapshotsResult;
    }

    return this.finalizeSelection(
      query,
      snapshotsResult.value,
      policy,
      timer()
    );
  }

  private async resolveCandidateSeeds(
    query: BranchSelectionQuery,
    discoveryCandidates?: readonly DiscoveryCandidate[]
  ): Promise<SdkAsyncResult<readonly AssignmentCandidateSeed[]>> {
    if (discoveryCandidates?.length) {
      return sdkOk(buildCandidateSeedsFromDiscovery(query, discoveryCandidates));
    }

    const branchIdsResult = await resolveRepositoryBranchIds(this.deps.repository, query);
    if (!isSdkSuccess(branchIdsResult)) {
      return branchIdsResult;
    }

    return sdkOk(buildCandidateSeedsFromBranchIds(query, branchIdsResult.value));
  }

  private finalizeSelection(
    query: BranchSelectionQuery,
    snapshots: readonly BranchOperationalSnapshot[],
    policy: BranchAssignmentPolicy,
    durationMs: number
  ): SdkAsyncResult<BranchAssignmentResult> {
    const context = {
      orderType: query.orderType,
      cartItemIds: query.cartItemIds,
    };

    const eligibleCount = countEligible(snapshots, context);
    const assignedAt = 0;
    const defaultReason = resolveAssignmentReason(query.orderType, policy);

    if (query.preferredBranchId) {
      const preferred = snapshots.find(
        (snapshot) => String(snapshot.branchId) === String(query.preferredBranchId)
      );

      if (preferred) {
        const validation = validateBranchForAssignment(preferred, context);
        const score = calculateBranchScore({
          branch: preferred,
          cartItemIds: query.cartItemIds,
        });

        if (validation.isValid && passesAssignmentScoreThreshold(score.total, policy)) {
          recordAssignmentPreferred(this.deps.onTelemetry, {
            tenantId: String(query.tenantId),
            branchId: preferred.branchId as BranchId,
            correlationId: query.correlationId,
          });

          const assignment = buildAssignment(
            query,
            preferred,
            validation,
            score,
            shouldPreferBranch(preferred.branchId as BranchId, query)
              ? 'default_branch'
              : defaultReason,
            assignedAt
          );

          recordAssignmentSuccess(this.deps.onTelemetry, {
            tenantId: String(query.tenantId),
            branchId: preferred.branchId as BranchId,
            correlationId: query.correlationId,
            eligibleCount,
            durationMs,
          });

          return sdkOk({
            assignment,
            score: assignment.score!,
            candidatesEvaluated: snapshots.length,
            eligibleCount,
            rankedBranchIds: [preferred.branchId as BranchId],
          });
        }
      }
    }

    const selected = selectBestEligibleBranch(snapshots, context);
    if (!selected.ok) {
      recordAssignmentNoEligible(this.deps.onTelemetry, {
        tenantId: String(query.tenantId),
        correlationId: query.correlationId,
        durationMs,
      });
      return sdkFail(
        sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.NO_ELIGIBLE_BRANCH, {
          branchCode: 'NO_ELIGIBLE_BRANCH',
        })
      );
    }

    const winner = snapshots.find(
      (snapshot) => snapshot.branchId === selected.value.branchId
    );
    if (!winner) {
      recordAssignmentNoEligible(this.deps.onTelemetry, {
        tenantId: String(query.tenantId),
        correlationId: query.correlationId,
        durationMs,
      });
      return sdkFail(
        sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.NO_ELIGIBLE_BRANCH, {
          branchCode: 'NO_ELIGIBLE_BRANCH',
        })
      );
    }

    const score = calculateBranchScore({
      branch: winner,
      cartItemIds: query.cartItemIds,
    });

    if (!passesAssignmentScoreThreshold(score.total, policy)) {
      recordAssignmentScoreRejected(this.deps.onTelemetry, {
        tenantId: String(query.tenantId),
        branchId: winner.branchId as BranchId,
        correlationId: query.correlationId,
      });
      return sdkFail(
        sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.NO_ELIGIBLE_BRANCH, {
          branchCode: 'SCORE_BELOW_THRESHOLD',
        })
      );
    }

    const assignment = buildAssignment(
      query,
      winner,
      selected.value,
      score,
      defaultReason,
      assignedAt
    );

    recordAssignmentSuccess(this.deps.onTelemetry, {
      tenantId: String(query.tenantId),
      branchId: winner.branchId as BranchId,
      correlationId: query.correlationId,
      eligibleCount,
      durationMs,
    });

    const rankedBranchIds = [...snapshots]
      .filter((snapshot) => validateBranchForAssignment(snapshot, context).isValid)
      .sort((left, right) => {
        const leftScore = calculateBranchScore({
          branch: left,
          cartItemIds: query.cartItemIds,
        });
        const rightScore = calculateBranchScore({
          branch: right,
          cartItemIds: query.cartItemIds,
        });
        if (leftScore.total !== rightScore.total) {
          return rightScore.total - leftScore.total;
        }
        return left.branchId.localeCompare(right.branchId);
      })
      .map((snapshot) => snapshot.branchId as BranchId);

    return sdkOk({
      assignment,
      score: assignment.score!,
      candidatesEvaluated: snapshots.length,
      eligibleCount,
      rankedBranchIds,
    });
  }
}

export const createDefaultBranchAssignmentEngine = (
  deps: DefaultBranchAssignmentEngineDeps
): DefaultBranchAssignmentEngine => new DefaultBranchAssignmentEngine(deps);
