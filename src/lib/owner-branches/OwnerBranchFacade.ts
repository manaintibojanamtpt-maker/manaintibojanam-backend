/**
 * M5 PR-13 — Owner branch management presentation facade.
 * Read-only orchestration via BranchFacade — no BranchSDK, no writes, no assignment.
 */

import {
  createBranchFacadeDeps,
  estimateETA,
  getBranch,
  getOperationalAvailability,
  listBranches,
  validateBranch,
  type BranchFacadeDeps,
} from '../branch/BranchFacade';
import {
  buildOwnerBranchEtaQuery,
  buildOwnerBranchGetQuery,
  buildOwnerBranchListQuery,
  buildOwnerBranchOperationalAvailabilityQuery,
  buildOwnerBranchValidateQuery,
} from './OwnerBranchContext';
import {
  mapBranchFacadeErrorToOwner,
  ownerBranchFeatureDisabledError,
  ownerBranchInvalidQueryError,
} from './OwnerBranchErrorMapper';
import { isOwnerBranchEnabledDefault } from './ownerBranchFeatureFlags';
import {
  getLastOwnerBranchRequest,
  getOwnerBranchRetryCount,
  getOwnerBranchSessionSnapshot,
  markOwnerBranchDisabled,
  markOwnerBranchEmpty,
  markOwnerBranchError,
  markOwnerBranchLoading,
  markOwnerBranchRetry,
  markOwnerBranchSuccess,
  resetOwnerBranchSession,
  subscribeOwnerBranchSession,
} from './OwnerBranchSession';
import {
  beginOwnerBranchTelemetry,
  completeOwnerBranchTelemetry,
  getOwnerBranchTelemetrySnapshot,
  recordOwnerBranchDisabledTelemetry,
  recordOwnerBranchFailureTelemetry,
  recordOwnerBranchRetryTelemetry,
  recordOwnerBranchSuccessTelemetry,
  resetOwnerBranchTelemetry,
  setOwnerBranchTelemetryHook,
  type OwnerBranchTelemetryHook,
} from './OwnerBranchTelemetry';
import type {
  OwnerBranchEtaOutcome,
  OwnerBranchEtaQuery,
  OwnerBranchGetOutcome,
  OwnerBranchGetQuery,
  OwnerBranchListOutcome,
  OwnerBranchListQuery,
  OwnerBranchOperationalAvailabilityOutcome,
  OwnerBranchOperationalAvailabilityQuery,
  OwnerBranchSessionSnapshot,
  OwnerBranchValidateOutcome,
  OwnerBranchValidateQuery,
} from './types';

export interface OwnerBranchFacadeDeps {
  readonly branchFacade?: BranchFacadeDeps;
  readonly isOwnerBranchEnabled?: () => boolean;
  readonly onTelemetry?: OwnerBranchTelemetryHook;
}

const DEFAULT_MAX_RETRIES = 3;

const createAttemptId = (): string =>
  `owner-branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createOwnerBranchFacadeDeps(
  overrides: OwnerBranchFacadeDeps = {}
): Required<Omit<OwnerBranchFacadeDeps, 'onTelemetry'>> &
  Pick<OwnerBranchFacadeDeps, 'onTelemetry'> {
  return {
    branchFacade: overrides.branchFacade ?? {},
    isOwnerBranchEnabled: overrides.isOwnerBranchEnabled ?? isOwnerBranchEnabledDefault,
    onTelemetry: overrides.onTelemetry,
  };
}

const ensureOwnerBranchEnabled = (deps: OwnerBranchFacadeDeps): boolean => {
  const resolved = createOwnerBranchFacadeDeps(deps);
  if (!resolved.isOwnerBranchEnabled()) {
    markOwnerBranchDisabled();
    return false;
  }
  return true;
};

const resolveBranchFacadeDeps = (deps: OwnerBranchFacadeDeps): BranchFacadeDeps =>
  createBranchFacadeDeps(deps.branchFacade);

export async function listOwnerBranches(
  query: OwnerBranchListQuery,
  deps: OwnerBranchFacadeDeps = {}
): Promise<OwnerBranchListOutcome> {
  setOwnerBranchTelemetryHook(deps.onTelemetry);

  if (!ensureOwnerBranchEnabled(deps)) {
    const attemptId = createAttemptId();
    recordOwnerBranchDisabledTelemetry(attemptId);
    return { ok: false, error: ownerBranchFeatureDisabledError() };
  }

  const attemptId = createAttemptId();
  beginOwnerBranchTelemetry(attemptId, 'listBranches');
  markOwnerBranchLoading({ operation: 'listBranches', query }, attemptId);

  if (!String(query.tenantId).trim()) {
    const error = ownerBranchInvalidQueryError('tenantId is required');
    markOwnerBranchError(error);
    completeOwnerBranchTelemetry('error');
    recordOwnerBranchFailureTelemetry('listBranches', attemptId, error.code);
    return { ok: false, error };
  }

  const facadeStartedAt = Date.now();
  const outcome = await listBranches(buildOwnerBranchListQuery(query), resolveBranchFacadeDeps(deps));
  const facadeMs = Date.now() - facadeStartedAt;

  if (!outcome.ok) {
    const error = mapBranchFacadeErrorToOwner(outcome.error);
    markOwnerBranchError(error);
    completeOwnerBranchTelemetry('error', facadeMs);
    recordOwnerBranchFailureTelemetry('listBranches', attemptId, error.code);
    return { ok: false, error };
  }

  if (outcome.branches.length === 0) {
    markOwnerBranchEmpty();
  } else {
    markOwnerBranchSuccess();
  }

  completeOwnerBranchTelemetry(outcome.branches.length === 0 ? 'empty' : 'success', facadeMs);
  recordOwnerBranchSuccessTelemetry('listBranches', attemptId);
  return { ok: true, branches: outcome.branches };
}

export async function getOwnerBranch(
  query: OwnerBranchGetQuery,
  deps: OwnerBranchFacadeDeps = {}
): Promise<OwnerBranchGetOutcome> {
  setOwnerBranchTelemetryHook(deps.onTelemetry);

  if (!ensureOwnerBranchEnabled(deps)) {
    return { ok: false, error: ownerBranchFeatureDisabledError() };
  }

  const attemptId = createAttemptId();
  beginOwnerBranchTelemetry(attemptId, 'getBranch');
  markOwnerBranchLoading({ operation: 'getBranch', query }, attemptId);

  const facadeStartedAt = Date.now();
  const outcome = await getBranch(buildOwnerBranchGetQuery(query), resolveBranchFacadeDeps(deps));
  const facadeMs = Date.now() - facadeStartedAt;

  if (!outcome.ok) {
    const error = mapBranchFacadeErrorToOwner(outcome.error);
    markOwnerBranchError(error);
    completeOwnerBranchTelemetry('error', facadeMs);
    recordOwnerBranchFailureTelemetry('getBranch', attemptId, error.code);
    return { ok: false, error };
  }

  markOwnerBranchSuccess();
  completeOwnerBranchTelemetry('success', facadeMs);
  recordOwnerBranchSuccessTelemetry('getBranch', attemptId);
  return { ok: true, branch: outcome.branch };
}

export async function getOwnerBranchOperationalAvailability(
  query: OwnerBranchOperationalAvailabilityQuery,
  deps: OwnerBranchFacadeDeps = {}
): Promise<OwnerBranchOperationalAvailabilityOutcome> {
  setOwnerBranchTelemetryHook(deps.onTelemetry);

  if (!ensureOwnerBranchEnabled(deps)) {
    return { ok: false, error: ownerBranchFeatureDisabledError() };
  }

  const attemptId = createAttemptId();
  beginOwnerBranchTelemetry(attemptId, 'getOperationalAvailability');
  markOwnerBranchLoading({ operation: 'getOperationalAvailability', query }, attemptId);

  const facadeStartedAt = Date.now();
  const outcome = await getOperationalAvailability(
    buildOwnerBranchOperationalAvailabilityQuery(query),
    resolveBranchFacadeDeps(deps)
  );
  const facadeMs = Date.now() - facadeStartedAt;

  if (!outcome.ok) {
    const error = mapBranchFacadeErrorToOwner(outcome.error);
    markOwnerBranchError(error);
    completeOwnerBranchTelemetry('error', facadeMs);
    recordOwnerBranchFailureTelemetry('getOperationalAvailability', attemptId, error.code);
    return { ok: false, error };
  }

  markOwnerBranchSuccess();
  completeOwnerBranchTelemetry('success', facadeMs);
  recordOwnerBranchSuccessTelemetry('getOperationalAvailability', attemptId);
  return { ok: true, availability: outcome.availability };
}

export function validateOwnerBranch(
  query: OwnerBranchValidateQuery,
  deps: OwnerBranchFacadeDeps = {}
): OwnerBranchValidateOutcome {
  setOwnerBranchTelemetryHook(deps.onTelemetry);

  if (!ensureOwnerBranchEnabled(deps)) {
    return { ok: false, error: ownerBranchFeatureDisabledError() };
  }

  const attemptId = createAttemptId();
  beginOwnerBranchTelemetry(attemptId, 'validateBranch');
  markOwnerBranchLoading({ operation: 'validateBranch', query }, attemptId);

  const facadeStartedAt = Date.now();
  const outcome = validateBranch(
    buildOwnerBranchValidateQuery(query),
    resolveBranchFacadeDeps(deps)
  );
  const facadeMs = Date.now() - facadeStartedAt;

  if (!outcome.ok) {
    const error = mapBranchFacadeErrorToOwner(outcome.error);
    markOwnerBranchError(error);
    completeOwnerBranchTelemetry('error', facadeMs);
    recordOwnerBranchFailureTelemetry('validateBranch', attemptId, error.code);
    return { ok: false, error };
  }

  markOwnerBranchSuccess();
  completeOwnerBranchTelemetry('success', facadeMs);
  recordOwnerBranchSuccessTelemetry('validateBranch', attemptId);
  return { ok: true, validation: outcome.validation };
}

export async function estimateOwnerBranchEta(
  query: OwnerBranchEtaQuery,
  deps: OwnerBranchFacadeDeps = {}
): Promise<OwnerBranchEtaOutcome> {
  setOwnerBranchTelemetryHook(deps.onTelemetry);

  if (!ensureOwnerBranchEnabled(deps)) {
    return { ok: false, error: ownerBranchFeatureDisabledError() };
  }

  const attemptId = createAttemptId();
  beginOwnerBranchTelemetry(attemptId, 'estimateETA');
  markOwnerBranchLoading({ operation: 'estimateETA', query }, attemptId);

  const facadeStartedAt = Date.now();
  const outcome = await estimateETA(buildOwnerBranchEtaQuery(query), resolveBranchFacadeDeps(deps));
  const facadeMs = Date.now() - facadeStartedAt;

  if (!outcome.ok) {
    const error = mapBranchFacadeErrorToOwner(outcome.error);
    markOwnerBranchError(error);
    completeOwnerBranchTelemetry('error', facadeMs);
    recordOwnerBranchFailureTelemetry('estimateETA', attemptId, error.code);
    return { ok: false, error };
  }

  markOwnerBranchSuccess();
  completeOwnerBranchTelemetry('success', facadeMs);
  recordOwnerBranchSuccessTelemetry('estimateETA', attemptId);
  return { ok: true, estimate: outcome.estimate };
}

export async function retryOwnerBranch(deps: OwnerBranchFacadeDeps = {}): Promise<
  | OwnerBranchListOutcome
  | OwnerBranchGetOutcome
  | OwnerBranchOperationalAvailabilityOutcome
  | OwnerBranchValidateOutcome
  | OwnerBranchEtaOutcome
> {
  const lastRequest = getLastOwnerBranchRequest();
  if (!lastRequest) {
    const error = ownerBranchInvalidQueryError('No prior owner branch request to retry');
    markOwnerBranchError(error);
    return { ok: false, error };
  }

  if (getOwnerBranchRetryCount() >= DEFAULT_MAX_RETRIES) {
    const error = ownerBranchInvalidQueryError(
      'Maximum owner branch retry attempts reached. Please try again later.'
    );
    markOwnerBranchError(error);
    return { ok: false, error };
  }

  markOwnerBranchRetry();
  recordOwnerBranchRetryTelemetry(
    lastRequest.operation,
    getOwnerBranchSessionSnapshot().telemetryId ?? createAttemptId(),
    getOwnerBranchRetryCount()
  );

  switch (lastRequest.operation) {
    case 'listBranches':
      return listOwnerBranches(lastRequest.query, deps);
    case 'getBranch':
      return getOwnerBranch(lastRequest.query, deps);
    case 'getOperationalAvailability':
      return getOwnerBranchOperationalAvailability(lastRequest.query, deps);
    case 'validateBranch':
      return validateOwnerBranch(lastRequest.query, deps);
    case 'estimateETA':
      return estimateOwnerBranchEta(lastRequest.query, deps);
    default: {
      const error = ownerBranchInvalidQueryError('Unsupported owner branch operation for retry');
      markOwnerBranchError(error);
      return { ok: false, error };
    }
  }
}

export function clearOwnerBranchSession(): void {
  resetOwnerBranchSession();
  resetOwnerBranchTelemetry();
}

export {
  getOwnerBranchSessionSnapshot,
  subscribeOwnerBranchSession,
  getOwnerBranchTelemetrySnapshot,
  isOwnerBranchEnabledDefault,
};

export type {
  OwnerBranchListQuery,
  OwnerBranchGetQuery,
  OwnerBranchOperationalAvailabilityQuery,
  OwnerBranchValidateQuery,
  OwnerBranchEtaQuery,
  OwnerBranchSessionSnapshot,
  OwnerBranchTelemetryHook,
};

export {
  ownerBranchFeatureDisabledError,
  normalizeOwnerBranchError,
} from './OwnerBranchErrorMapper';

export { OWNER_BRANCH_FLAG, OWNER_BRANCH_FLAG_ENV_KEY } from './ownerBranchFeatureFlags';

/** Spec alias */
export const resetSession = clearOwnerBranchSession;

/** Spec alias */
export const subscribeSession = subscribeOwnerBranchSession;

/** Spec alias */
export const retry = retryOwnerBranch;
