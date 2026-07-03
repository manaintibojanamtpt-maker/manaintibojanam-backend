/**
 * M5 PR-5 — Branch presentation facade (ADR-011 / ADR-015).
 * Presentation MUST use this module — not BranchSDK, BranchRepository, or Firestore directly.
 */

import { createBranchSDK } from '../../sdk/branch/createBranchSDK';
import type { BranchSDK } from '../../sdk/branch/contracts/BranchSDK';
import { createBranchOperationsSdk } from '../../sdk/branch/operations-sdk/createBranchOperationsSdk';
import type { BranchOperationsSDK } from '../../sdk/branch/operations-sdk/contracts/BranchOperationsSDK';
import { isSdkSuccess } from '../../sdk/core/resultHelpers';
import { readCustomerLocationSession } from '../customerLocation/CustomerLocationFacade';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import {
  buildBranchEligibilityContext,
  buildBranchEtaContext,
  buildBranchListContext,
  buildBranchSelectionContext,
  buildBranchValidationContext,
} from './BranchContext';
import {
  branchFeatureDisabledError,
  branchInvalidQueryError,
  normalizeBranchError,
} from './BranchErrorMapper';
import { isBranchEnabled, readBranchFeatureFlag } from './BranchFeatureFlags';
import {
  getBranchRetryCount,
  getBranchSessionSnapshot,
  getLastBranchRequest,
  markBranchDisabled,
  markBranchEmpty,
  markBranchError,
  markBranchLoading,
  markBranchRetry,
  markBranchSuccess,
  resetBranchSession,
  subscribeBranchSession,
} from './BranchSession';
import {
  beginBranchTelemetry,
  completeBranchTelemetry,
  getBranchTelemetrySnapshot,
  recordBranchContextTiming,
  recordBranchFailureTelemetry,
  recordBranchRetryTelemetry,
  recordBranchSuccessTelemetry,
  resetBranchTelemetry,
  setBranchTelemetryHook,
} from './BranchTelemetry';
import type {
  BranchAssignmentFacadeOutcome,
  BranchEligibleFacadeOutcome,
  BranchEligibilityFacadeQuery,
  BranchEtaFacadeOutcome,
  BranchEtaFacadeQuery,
  BranchFacadeRequest,
  BranchGetFacadeOutcome,
  BranchGetFacadeQuery,
  BranchListFacadeOutcome,
  BranchListFacadeQuery,
  BranchOperationsAvailabilityFacadeOutcome,
  BranchOperationsAvailabilityFacadeQuery,
  BranchPresentationTelemetryHook,
  BranchSelectionFacadeQuery,
  BranchSessionSnapshot,
  BranchValidateFacadeOutcome,
  BranchValidateFacadeQuery,
} from './types';

export interface BranchFacadeDeps {
  readonly sdk?: BranchSDK;
  readonly operationsSdk?: BranchOperationsSDK;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
  readonly isEnabled?: () => boolean;
  readonly onTelemetry?: BranchPresentationTelemetryHook;
}

const DEFAULT_MAX_RETRIES = 3;

const createAttemptId = (): string =>
  `branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createBranchFacadeDeps(
  overrides: BranchFacadeDeps = {}
): Required<Omit<BranchFacadeDeps, 'onTelemetry'>> & Pick<BranchFacadeDeps, 'onTelemetry'> {
  return {
    sdk:
      overrides.sdk ??
      createBranchSDK({
        featureFlags: readBranchFeatureFlag,
      }),
    operationsSdk:
      overrides.operationsSdk ??
      createBranchOperationsSdk({
        featureFlags: readBranchFeatureFlag,
      }),
    readCustomerLocation: overrides.readCustomerLocation ?? readCustomerLocationSession,
    isEnabled: overrides.isEnabled ?? isBranchEnabled,
    onTelemetry: overrides.onTelemetry,
  };
}

const ensureEnabled = (deps: BranchFacadeDeps): boolean => {
  const resolved = createBranchFacadeDeps(deps);
  if (!resolved.isEnabled()) {
    markBranchDisabled();
    completeBranchTelemetry('disabled');
    return false;
  }
  return true;
};

const initTelemetry = (
  operation: BranchFacadeRequest['operation'],
  deps: BranchFacadeDeps
): string => {
  setBranchTelemetryHook(deps.onTelemetry);
  const attemptId = createAttemptId();
  beginBranchTelemetry(attemptId, operation);
  return attemptId;
};

export async function listBranches(
  query: BranchListFacadeQuery,
  deps: BranchFacadeDeps = {}
): Promise<BranchListFacadeOutcome> {
  if (!ensureEnabled(deps)) {
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'listBranches', query };
  const attemptId = initTelemetry('listBranches', deps);

  const contextStartedAt = Date.now();
  const built = buildBranchListContext({
    facadeQuery: query,
    customerLocation: resolved.readCustomerLocation(),
  });
  recordBranchContextTiming(Date.now() - contextStartedAt);

  if (!isSdkSuccess(built)) {
    const error = normalizeBranchError(built.error);
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.sdk.listBranches(built.value.filter);
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  if (sdkResult.value.length === 0) {
    markBranchEmpty();
    completeBranchTelemetry('empty', sdkMs);
    recordBranchSuccessTelemetry();
    return { ok: true, branches: sdkResult.value };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, branches: sdkResult.value };
}

export async function getBranch(
  query: BranchGetFacadeQuery,
  deps: BranchFacadeDeps = {}
): Promise<BranchGetFacadeOutcome> {
  if (!ensureEnabled(deps)) {
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'getBranch', query };

  if (!String(query.branchId).trim()) {
    const error = branchInvalidQueryError('branchId is required');
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  const attemptId = initTelemetry('getBranch', deps);
  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.sdk.getBranch(query.branchId);
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, branch: sdkResult.value };
}

export async function findEligibleBranches(
  query: BranchEligibilityFacadeQuery,
  deps: BranchFacadeDeps = {}
): Promise<BranchEligibleFacadeOutcome> {
  if (!ensureEnabled(deps)) {
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'findEligibleBranches', query };
  const attemptId = initTelemetry('findEligibleBranches', deps);

  const contextStartedAt = Date.now();
  const built = buildBranchEligibilityContext({
    facadeQuery: query,
    customerLocation: resolved.readCustomerLocation(),
  });
  recordBranchContextTiming(Date.now() - contextStartedAt);

  if (!isSdkSuccess(built)) {
    const error = normalizeBranchError(built.error);
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.sdk.findEligibleBranches(built.value.query);
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  if (sdkResult.value.length === 0) {
    markBranchEmpty();
    completeBranchTelemetry('empty', sdkMs);
    recordBranchSuccessTelemetry();
    return { ok: true, candidates: sdkResult.value };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, candidates: sdkResult.value };
}

export function validateBranch(
  query: BranchValidateFacadeQuery,
  deps: BranchFacadeDeps = {}
): BranchValidateFacadeOutcome {
  if (!createBranchFacadeDeps(deps).isEnabled()) {
    markBranchDisabled();
    completeBranchTelemetry('disabled');
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'validateBranch', query };
  const attemptId = initTelemetry('validateBranch', deps);

  const contextStartedAt = Date.now();
  const built = buildBranchValidationContext({
    facadeQuery: query,
    customerLocation: resolved.readCustomerLocation(),
  });
  recordBranchContextTiming(Date.now() - contextStartedAt);

  if (!isSdkSuccess(built)) {
    const error = normalizeBranchError(built.error);
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = resolved.sdk.validateBranch(built.value.input);
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  if (!sdkResult.value.isValid) {
    markBranchEmpty();
    completeBranchTelemetry('empty', sdkMs);
    recordBranchSuccessTelemetry();
    return { ok: true, validation: sdkResult.value };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, validation: sdkResult.value };
}

export async function estimateETA(
  query: BranchEtaFacadeQuery,
  deps: BranchFacadeDeps = {}
): Promise<BranchEtaFacadeOutcome> {
  if (!ensureEnabled(deps)) {
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'estimateETA', query };
  const attemptId = initTelemetry('estimateETA', deps);

  const contextStartedAt = Date.now();
  const built = buildBranchEtaContext({
    facadeQuery: query,
    customerLocation: resolved.readCustomerLocation(),
  });
  recordBranchContextTiming(Date.now() - contextStartedAt);

  if (!isSdkSuccess(built)) {
    const error = normalizeBranchError(built.error);
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.sdk.estimateETA(built.value.input);
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, estimate: sdkResult.value };
}

export async function findBestBranch(
  query: BranchSelectionFacadeQuery,
  deps: BranchFacadeDeps = {}
): Promise<BranchAssignmentFacadeOutcome> {
  if (!ensureEnabled(deps)) {
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'findBestBranch', query };
  const attemptId = initTelemetry('findBestBranch', deps);

  const contextStartedAt = Date.now();
  const built = buildBranchSelectionContext({
    facadeQuery: query,
    customerLocation: resolved.readCustomerLocation(),
  });
  recordBranchContextTiming(Date.now() - contextStartedAt);

  if (!isSdkSuccess(built)) {
    const error = normalizeBranchError(built.error);
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.sdk.findBestBranch(built.value.query);
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, assignment: sdkResult.value };
}

export async function getOperationalAvailability(
  query: BranchOperationsAvailabilityFacadeQuery,
  deps: BranchFacadeDeps = {}
): Promise<BranchOperationsAvailabilityFacadeOutcome> {
  if (!ensureEnabled(deps)) {
    return { ok: false, error: branchFeatureDisabledError() };
  }

  const resolved = createBranchFacadeDeps(deps);
  const request: BranchFacadeRequest = { operation: 'getOperationalAvailability', query };
  const attemptId = initTelemetry('getOperationalAvailability', deps);

  if (!String(query.branchId).trim()) {
    const error = branchInvalidQueryError('branchId is required');
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchLoading(request, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.operationsSdk.getOperationalAvailability({
    branchId: query.branchId,
    tenantId: query.tenantId ? String(query.tenantId) : undefined,
    branchName: query.branchName,
    branchStatus: query.branchStatus,
    cartItemIds: query.cartItemIds,
    evaluatedAt: query.evaluatedAt,
    correlationId: query.correlationId,
  });
  const sdkMs = Date.now() - sdkStartedAt;

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeBranchError(sdkResult.error);
    markBranchError(error);
    completeBranchTelemetry('error', sdkMs);
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchSuccess();
  completeBranchTelemetry('success', sdkMs);
  recordBranchSuccessTelemetry();
  return { ok: true, availability: sdkResult.value };
}

export async function retryBranch(deps: BranchFacadeDeps = {}): Promise<
  | BranchListFacadeOutcome
  | BranchGetFacadeOutcome
  | BranchEligibleFacadeOutcome
  | BranchValidateFacadeOutcome
  | BranchEtaFacadeOutcome
  | BranchAssignmentFacadeOutcome
  | BranchOperationsAvailabilityFacadeOutcome
> {
  const lastRequest = getLastBranchRequest();
  if (!lastRequest) {
    const error = branchInvalidQueryError('No prior branch request to retry');
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  if (getBranchRetryCount() >= DEFAULT_MAX_RETRIES) {
    const error = branchInvalidQueryError(
      'Maximum retry attempts reached. Please try again later.'
    );
    markBranchError(error);
    completeBranchTelemetry('error');
    recordBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markBranchRetry();
  recordBranchRetryTelemetry(getBranchRetryCount());

  switch (lastRequest.operation) {
    case 'listBranches':
      return listBranches(lastRequest.query, deps);
    case 'getBranch':
      return getBranch(lastRequest.query, deps);
    case 'findEligibleBranches':
      return findEligibleBranches(lastRequest.query, deps);
    case 'validateBranch':
      return validateBranch(lastRequest.query, deps);
    case 'estimateETA':
      return estimateETA(lastRequest.query, deps);
    case 'findBestBranch':
      return findBestBranch(lastRequest.query, deps);
    case 'getOperationalAvailability':
      return getOperationalAvailability(lastRequest.query, deps);
    default: {
      const error = branchInvalidQueryError('Unsupported branch operation for retry');
      markBranchError(error);
      return { ok: false, error };
    }
  }
}

export {
  getBranchSessionSnapshot,
  subscribeBranchSession,
  resetBranchSession,
  getLastBranchRequest,
  getBranchTelemetrySnapshot,
  resetBranchTelemetry,
};

export type {
  BranchListFacadeQuery,
  BranchGetFacadeQuery,
  BranchEligibilityFacadeQuery,
  BranchValidateFacadeQuery,
  BranchEtaFacadeQuery,
  BranchSelectionFacadeQuery,
  BranchListFacadeOutcome,
  BranchGetFacadeOutcome,
  BranchEligibleFacadeOutcome,
  BranchValidateFacadeOutcome,
  BranchEtaFacadeOutcome,
  BranchAssignmentFacadeOutcome,
  BranchOperationsAvailabilityFacadeQuery,
  BranchOperationsAvailabilityFacadeOutcome,
  BranchSessionSnapshot,
};

export {
  isBranchEnabled,
  isBranchRepositoryEnabled,
  readBranchFeatureFlag,
} from './BranchFeatureFlags';

export {
  normalizeBranchError,
  branchFeatureDisabledError,
} from './BranchErrorMapper';

/** Spec alias */
export const retry = retryBranch;

/** Spec alias */
export const resetSession = resetBranchSession;

/** Spec alias */
export const subscribeSession = subscribeBranchSession;
