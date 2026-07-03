/**
 * BranchSDK — operations orchestration (M5 PR-12).
 * Wires operations repository reads to domain evaluation — no scoring or assignment.
 */

import { evaluateBranchOperations } from '../../../domain/branch/operations/BranchOperationsEvaluator';
import type { BranchOperationsAvailabilityResult } from '../../../domain/branch/operations/BranchAvailabilitySummary';
import { isSdkSuccess, sdkOk } from '../../core/resultHelpers';
import type { SdkAsyncResult } from '../../core/result';
import type {
  BranchOperationsAvailabilityDto,
  BranchOperationsAvailabilityQuery,
} from '../dto/operations';
import type { BranchId } from '../types/branded';
import type { BranchOperationalSnapshotDto } from '../operations/BranchOperationsRepository';
import type { BranchOperationsRepository } from '../operations/BranchOperationsRepository';
import {
  mapHoursSnapshotToWeeklyHours,
  mapOperationalSnapshotDtoToDomainSnapshot,
  mapOperationsAvailabilityResultToDto,
} from './BranchOperationsDomainMapper';
import {
  mapOperationsRepositoryResultToSdk,
  operationsInvalidQueryError,
  operationsRepositoryUnavailable,
} from './BranchOperationsErrorMapper';
import {
  createBranchOperationsPipelineTimer,
  createBranchOperationsTelemetryEmitter,
  type BranchOperationsTelemetryHook,
} from './BranchOperationsTelemetry';
import type { BranchOperationsEvaluatorFn } from './createBranchOperationsSdk.options';

export interface BranchOperationsOrchestratorDeps {
  readonly repository: BranchOperationsRepository;
  readonly repositoryEnabled: boolean;
  readonly onTelemetry?: BranchOperationsTelemetryHook;
  readonly evaluateOperations?: BranchOperationsEvaluatorFn;
}

const defaultEvaluateOperations: BranchOperationsEvaluatorFn = (snapshot, context) =>
  evaluateBranchOperations(snapshot, {
    ...context,
    operationsEnabled: true,
  });

const validateOperationsQuery = (
  query: BranchOperationsAvailabilityQuery
): SdkAsyncResult<BranchOperationsAvailabilityQuery> => {
  if (!String(query.branchId).trim()) {
    return operationsInvalidQueryError('branchId is required');
  }

  return sdkOk(query);
};

export const orchestrateGetOperationalSnapshot = async (
  deps: BranchOperationsOrchestratorDeps,
  branchId: BranchId
): SdkAsyncResult<BranchOperationalSnapshotDto> => {
  const telemetry = createBranchOperationsTelemetryEmitter(
    deps.onTelemetry,
    'getOperationalSnapshot'
  );
  telemetry.request({ branchId: String(branchId) });

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', { branchId: String(branchId) });
    return operationsRepositoryUnavailable('getOperationalSnapshot');
  }

  const repositoryTimer = createBranchOperationsPipelineTimer();
  const snapshotResult = mapOperationsRepositoryResultToSdk(
    await deps.repository.getOperationalSnapshot(branchId)
  );
  const repositoryMs = repositoryTimer();

  if (!isSdkSuccess(snapshotResult)) {
    telemetry.failure(snapshotResult.error.code, { branchId: String(branchId) });
    return snapshotResult;
  }

  telemetry.repositoryRead(String(branchId), repositoryMs);
  telemetry.success({
    branchId: String(branchId),
    timingMs: { repositoryMs, totalMs: repositoryMs },
  });

  return snapshotResult;
};

export const orchestrateGetOperationalAvailability = async (
  deps: BranchOperationsOrchestratorDeps,
  query: BranchOperationsAvailabilityQuery
): SdkAsyncResult<BranchOperationsAvailabilityDto> => {
  const telemetry = createBranchOperationsTelemetryEmitter(
    deps.onTelemetry,
    'getOperationalAvailability',
    query.correlationId
  );
  telemetry.request({ branchId: String(query.branchId) });

  const validationTimer = createBranchOperationsPipelineTimer();
  const validated = validateOperationsQuery(query);
  const validationMs = validationTimer();

  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { branchId: String(query.branchId) });
    return validated;
  }

  if (!deps.repositoryEnabled) {
    telemetry.failure('REPOSITORY_UNAVAILABLE', { branchId: String(query.branchId) });
    return operationsRepositoryUnavailable('getOperationalAvailability');
  }

  const repositoryTimer = createBranchOperationsPipelineTimer();
  const snapshotResult = mapOperationsRepositoryResultToSdk(
    await deps.repository.getOperationalSnapshot(query.branchId)
  );
  const repositoryMs = repositoryTimer();

  if (!isSdkSuccess(snapshotResult)) {
    telemetry.failure(snapshotResult.error.code, { branchId: String(query.branchId) });
    return snapshotResult;
  }

  telemetry.repositoryRead(String(query.branchId), repositoryMs);

  const dto = snapshotResult.value;
  const domainSnapshot = mapOperationalSnapshotDtoToDomainSnapshot(dto, validated.value);
  const weeklyHours = mapHoursSnapshotToWeeklyHours(dto.hours);
  const evaluatedAt = query.evaluatedAt ?? dto.capturedAt;

  const domainTimer = createBranchOperationsPipelineTimer();
  const evaluate = deps.evaluateOperations ?? defaultEvaluateOperations;
  const evaluation: BranchOperationsAvailabilityResult = evaluate(domainSnapshot, {
    cartItemIds: query.cartItemIds,
    requireFullInventoryCoverage: query.requireFullInventoryCoverage,
    evaluatedAt,
    weeklyHours,
    operationsEnabled: true,
  });
  const domainMs = domainTimer();

  telemetry.domainEvaluation(String(query.branchId), domainMs);

  const availability = mapOperationsAvailabilityResultToDto(evaluation, dto.capturedAt);

  telemetry.success({
    branchId: String(query.branchId),
    timingMs: {
      validationMs,
      repositoryMs,
      domainMs,
      totalMs: validationMs + repositoryMs + domainMs,
    },
  });

  return sdkOk(availability);
};
