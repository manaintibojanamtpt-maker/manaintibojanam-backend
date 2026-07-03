/**
 * BranchSDK — orchestration layer (M5 PR-4).
 * Wires repository reads to domain evaluation — no scoring or assignment.
 */

import { filterEligibleBranches } from '../../../domain/branch/eligibility/BranchEligibilityValidator';
import { evaluateBranchEligibility } from '../../../domain/branch/eligibility/BranchEligibilityValidator';
import { validateBranchForAssignment } from '../../../domain/branch/validation/BranchValidation';
import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import { isSdkSuccess, sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type {
  BranchDetail,
  BranchEligibilityQuery,
  BranchETAInput,
  BranchETAEstimate,
  BranchListFilter,
  BranchSummary,
  BranchCandidate,
  BranchValidationInput,
  BranchValidationResult,
} from '../dto';
import type { BranchId } from '../types/branded';
import type { BranchRepository } from '../repository/BranchRepository';
import {
  validateBranchEligibilityQuery,
  validateBranchETAInput,
  validateBranchListFilter,
  validateBranchValidationInput,
} from '../validation/validateBranchQuery';
import {
  buildBranchEtaEstimate,
  mapReadBundleToOperationalSnapshot,
  mapToBranchCandidate,
  mapValidationToDto,
  type BranchOperationalReadBundle,
} from './BranchDomainMapper';
import {
  branchNotFound,
  mapRepositoryResultToSdk,
  repositoryUnavailable,
} from './BranchErrorMapper';
import {
  createBranchPipelineTimer,
  createBranchTelemetryEmitter,
  type BranchTelemetryHook,
} from './BranchTelemetry';

export interface BranchSdkOrchestratorDeps {
  readonly repository: BranchRepository;
  readonly repositoryEnabled: boolean;
  readonly onTelemetry?: BranchTelemetryHook;
  readonly syncSnapshotResolver?: (
    input: BranchValidationInput
  ) => BranchOperationalSnapshot | undefined;
}

const loadBranchReadBundle = async (
  repository: BranchRepository,
  branchId: BranchId
): Promise<SdkAsyncResult<BranchOperationalReadBundle>> => {
  const detailResult = mapRepositoryResultToSdk(await repository.getBranchById(branchId));
  if (!isSdkSuccess(detailResult)) {
    return detailResult;
  }

  const [statusRaw, capacityRaw, inventoryRaw] = await Promise.all([
    repository.getBranchStatus(branchId),
    repository.getBranchCapacity(branchId),
    repository.getBranchInventory(branchId),
  ]);

  const statusResult = mapRepositoryResultToSdk(statusRaw);
  const capacityResult = mapRepositoryResultToSdk(capacityRaw);
  const inventoryResult = mapRepositoryResultToSdk(inventoryRaw);

  if (!isSdkSuccess(statusResult)) {
    return statusResult;
  }
  if (!isSdkSuccess(capacityResult)) {
    return capacityResult;
  }
  if (!isSdkSuccess(inventoryResult)) {
    return inventoryResult;
  }

  const detail = detailResult.value;

  return sdkOk({
    summary: {
      branchId: detail.branchId,
      tenantId: detail.tenantId,
      name: detail.name,
      slug: detail.slug,
      status: detail.status,
      isDefault: detail.isDefault,
    },
    detail,
    status: statusResult.value,
    capacity: capacityResult.value,
    inventory: inventoryResult.value,
  });
};

export const orchestrateListBranches = async (
  deps: BranchSdkOrchestratorDeps,
  filter: BranchListFilter
): SdkAsyncResult<BranchSummary[]> => {
  const telemetry = createBranchTelemetryEmitter(deps.onTelemetry, 'listBranches');
  telemetry.request({ tenantId: String(filter.tenantId) });

  const validationTimer = createBranchPipelineTimer();
  const validated = validateBranchListFilter(filter);
  const validationMs = validationTimer();

  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(filter.tenantId) });
    return validated;
  }

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', { tenantId: String(filter.tenantId) });
    return repositoryUnavailable('listBranches');
  }

  const repositoryTimer = createBranchPipelineTimer();
  const listed = mapRepositoryResultToSdk(await deps.repository.listBranches(validated.value));
  const repositoryMs = repositoryTimer();

  if (!isSdkSuccess(listed)) {
    telemetry.failure(listed.error.code, { tenantId: String(filter.tenantId) });
    return listed;
  }

  telemetry.repositoryRead({ tenantId: String(filter.tenantId), branchCount: listed.value.length });
  telemetry.success({
    tenantId: String(filter.tenantId),
    branchCount: listed.value.length,
    timingMs: { validationMs, repositoryMs, totalMs: validationMs + repositoryMs },
  });

  return listed;
};

export const orchestrateGetBranch = async (
  deps: BranchSdkOrchestratorDeps,
  branchId: BranchId
): SdkAsyncResult<BranchDetail> => {
  const telemetry = createBranchTelemetryEmitter(deps.onTelemetry, 'getBranch');
  telemetry.request({ branchId: String(branchId) });

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', { branchId: String(branchId) });
    return repositoryUnavailable('getBranch');
  }

  const repositoryTimer = createBranchPipelineTimer();
  const detail = mapRepositoryResultToSdk(await deps.repository.getBranchById(branchId));
  const repositoryMs = repositoryTimer();

  if (!isSdkSuccess(detail)) {
    telemetry.failure(detail.error.code, { branchId: String(branchId) });
    return detail;
  }

  telemetry.success({
    branchId: String(branchId),
    timingMs: { repositoryMs, totalMs: repositoryMs },
  });

  return detail;
};

export const orchestrateFindEligibleBranches = async (
  deps: BranchSdkOrchestratorDeps,
  query: BranchEligibilityQuery
): SdkAsyncResult<BranchCandidate[]> => {
  const telemetry = createBranchTelemetryEmitter(deps.onTelemetry, 'findEligibleBranches', query.tenantId);
  telemetry.request({ tenantId: String(query.tenantId) });

  const validationTimer = createBranchPipelineTimer();
  const validated = validateBranchEligibilityQuery(query);
  const validationMs = validationTimer();

  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', { tenantId: String(query.tenantId) });
    return repositoryUnavailable('findEligibleBranches');
  }

  const repositoryTimer = createBranchPipelineTimer();
  const listed = mapRepositoryResultToSdk(
    await deps.repository.listBranches({
      tenantId: validated.value.tenantId,
      includeInactive: validated.value.includeClosed,
    })
  );

  if (!isSdkSuccess(listed)) {
    telemetry.failure(listed.error.code, { tenantId: String(query.tenantId) });
    return listed;
  }

  const snapshots: BranchOperationalSnapshot[] = [];

  for (const summary of listed.value) {
    const bundle = await loadBranchReadBundle(deps.repository, summary.branchId);
    if (!isSdkSuccess(bundle)) {
      telemetry.failure(bundle.error.code, { branchId: String(summary.branchId) });
      return bundle;
    }

    snapshots.push(
      mapReadBundleToOperationalSnapshot(bundle.value, validated.value.customerPoint)
    );
  }

  const repositoryMs = repositoryTimer();

  const domainTimer = createBranchPipelineTimer();
  const eligibleResults = filterEligibleBranches(snapshots, {
    orderType: validated.value.orderType,
  });
  const domainMs = domainTimer();

  const candidates = eligibleResults
    .map((eligibility) => {
      const snapshot = snapshots.find((item) => item.branchId === eligibility.branchId);
      if (!snapshot) {
        return undefined;
      }

      return mapToBranchCandidate(snapshot, eligibility);
    })
    .filter((candidate): candidate is BranchCandidate => candidate !== undefined);

  const limited =
    validated.value.limit !== undefined && validated.value.limit >= 0
      ? candidates.slice(0, validated.value.limit)
      : candidates;

  telemetry.domainEvaluation({
    tenantId: String(query.tenantId),
    branchCount: limited.length,
  });
  telemetry.success({
    tenantId: String(query.tenantId),
    branchCount: limited.length,
    timingMs: { validationMs, repositoryMs, domainMs, totalMs: validationMs + repositoryMs + domainMs },
  });

  return sdkOk(limited);
};

export const orchestrateValidateBranch = (
  deps: BranchSdkOrchestratorDeps,
  input: BranchValidationInput
): SdkResult<BranchValidationResult> => {
  const telemetry = createBranchTelemetryEmitter(deps.onTelemetry, 'validateBranch');
  telemetry.request({ tenantId: String(input.tenantId), branchId: String(input.branchId) });

  const validationTimer = createBranchPipelineTimer();
  const validated = validateBranchValidationInput(input);
  const validationMs = validationTimer();

  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, {
      tenantId: String(input.tenantId),
      branchId: String(input.branchId),
    });
    return validated;
  }

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', {
      tenantId: String(input.tenantId),
      branchId: String(input.branchId),
    });
    return repositoryUnavailable('validateBranch');
  }

  if (!deps.syncSnapshotResolver) {
    telemetry.failure('SNAPSHOT_RESOLVER_REQUIRED', {
      tenantId: String(input.tenantId),
      branchId: String(input.branchId),
    });
    return repositoryUnavailable('validateBranch');
  }

  const snapshot = deps.syncSnapshotResolver(validated.value);
  if (!snapshot) {
    telemetry.failure('NOT_FOUND', {
      tenantId: String(input.tenantId),
      branchId: String(input.branchId),
    });
    return branchNotFound('Branch', String(input.branchId));
  }

  const domainTimer = createBranchPipelineTimer();
  const domainResult = validateBranchForAssignment(snapshot, {
    orderType: validated.value.orderType,
    cartItemIds: validated.value.cartItemIds,
  });
  const domainMs = domainTimer();

  telemetry.domainEvaluation({
    tenantId: String(input.tenantId),
    branchId: String(input.branchId),
  });
  telemetry.success({
    tenantId: String(input.tenantId),
    branchId: String(input.branchId),
    timingMs: { validationMs, domainMs, totalMs: validationMs + domainMs },
  });

  return sdkOk(mapValidationToDto(domainResult));
};

export const orchestrateEstimateETA = async (
  deps: BranchSdkOrchestratorDeps,
  input: BranchETAInput
): SdkAsyncResult<BranchETAEstimate> => {
  const telemetry = createBranchTelemetryEmitter(deps.onTelemetry, 'estimateETA');
  telemetry.request({
    tenantId: String(input.tenantId),
    branchId: String(input.branchId),
  });

  const validationTimer = createBranchPipelineTimer();
  const validated = validateBranchETAInput(input);
  const validationMs = validationTimer();

  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { branchId: String(input.branchId) });
    return validated;
  }

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', { branchId: String(input.branchId) });
    return repositoryUnavailable('estimateETA');
  }

  const repositoryTimer = createBranchPipelineTimer();
  const bundle = await loadBranchReadBundle(deps.repository, validated.value.branchId);
  const repositoryMs = repositoryTimer();

  if (!isSdkSuccess(bundle)) {
    telemetry.failure(bundle.error.code, { branchId: String(input.branchId) });
    return bundle;
  }

  const snapshot = mapReadBundleToOperationalSnapshot(bundle.value, validated.value.customerPoint);
  const eligibility = evaluateBranchEligibility(snapshot, {
    orderType: validated.value.orderType,
  });

  if (!eligibility.isEligible) {
    telemetry.failure('VALIDATION_FAILED', { branchId: String(input.branchId) });
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.VALIDATION_FAILED, {
        branchCode: 'VALIDATION_FAILED',
        branchId: String(input.branchId),
        status: eligibility.status,
      })
    );
  }

  const prepTimeMins = snapshot.prepQueueMins ?? 0;
  const estimate = buildBranchEtaEstimate(
    validated.value.branchId,
    prepTimeMins,
    snapshot.distanceKm,
    validated.value.orderType
  );

  telemetry.success({
    branchId: String(input.branchId),
    timingMs: { validationMs, repositoryMs, totalMs: validationMs + repositoryMs },
  });

  return sdkOk(estimate);
};

export const createSyncSnapshotResolverFromRepository = (
  repository: BranchRepository,
  bundles: ReadonlyMap<string, BranchOperationalReadBundle>
) => {
  return (input: BranchValidationInput): BranchOperationalSnapshot | undefined => {
    const bundle = bundles.get(String(input.branchId));
    if (!bundle) {
      return undefined;
    }

    void repository;
    return mapReadBundleToOperationalSnapshot(bundle, input.customerPoint);
  };
};
