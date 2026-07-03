/**
 * M5 PR-8 — Checkout branch assignment facade.
 * Resolves fulfillment branch before payment via BranchFacade → BranchSDK.findBestBranch().
 * No Order creation. No persistence. No payment changes.
 */

import {
  createBranchFacadeDeps,
  findBestBranch,
  type BranchFacadeDeps,
} from '../branch/BranchFacade';
import { readCustomerLocationSession } from '../customerLocation/CustomerLocationFacade';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import {
  attachCheckoutBranchAssignment,
  buildCheckoutBranchSelectionQuery,
  createLegacyCheckoutBranchContext,
  isCheckoutBranchEnabledDefault,
  type CheckoutBranchAssignmentSummary,
  type CheckoutBranchContextSnapshot,
  type CheckoutBranchResolveQuery,
} from './CheckoutBranchContext';
import {
  checkoutInvalidQueryError,
  mapBranchFacadeErrorToCheckout,
  type CheckoutBranchPresentationError,
} from './CheckoutBranchErrorMapper';
import {
  getCheckoutBranchRetryCount,
  getCheckoutBranchSessionSnapshot,
  getLastCheckoutBranchQuery,
  markCheckoutBranchAssigned,
  markCheckoutBranchCancelled,
  markCheckoutBranchDisabled,
  markCheckoutBranchError,
  markCheckoutBranchLegacy,
  markCheckoutBranchLoading,
  markCheckoutBranchRejected,
  markCheckoutBranchRetry,
  resetCheckoutBranchSession,
  subscribeCheckoutBranchSession,
  type CheckoutBranchSessionSnapshot,
} from './CheckoutBranchSession';
import {
  beginCheckoutBranchTelemetry,
  completeCheckoutBranchTelemetry,
  getCheckoutBranchTelemetrySnapshot,
  recordCheckoutBranchCancelTelemetry,
  recordCheckoutBranchFailureTelemetry,
  recordCheckoutBranchLegacyTelemetry,
  recordCheckoutBranchRetryTelemetry,
  recordCheckoutBranchSuccessTelemetry,
  resetCheckoutBranchTelemetry,
  setCheckoutBranchTelemetryHook,
  type CheckoutBranchTelemetryHook,
} from './CheckoutBranchTelemetry';

export interface CheckoutBranchFacadeDeps {
  readonly branchFacade?: BranchFacadeDeps;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
  readonly isCheckoutBranchEnabled?: () => boolean;
  readonly onTelemetry?: CheckoutBranchTelemetryHook;
}

const DEFAULT_MAX_RETRIES = 3;

const createAttemptId = (): string =>
  `checkout-branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createCheckoutBranchFacadeDeps(
  overrides: CheckoutBranchFacadeDeps = {}
): Required<Omit<CheckoutBranchFacadeDeps, 'onTelemetry'>> &
  Pick<CheckoutBranchFacadeDeps, 'onTelemetry'> {
  return {
    branchFacade: overrides.branchFacade ?? {},
    readCustomerLocation: overrides.readCustomerLocation ?? readCustomerLocationSession,
    isCheckoutBranchEnabled:
      overrides.isCheckoutBranchEnabled ?? isCheckoutBranchEnabledDefault,
    onTelemetry: overrides.onTelemetry,
  };
}

export type CheckoutBranchResolveOutcome =
  | {
      readonly ok: true;
      readonly legacy: true;
      readonly assignment: null;
      readonly summary: null;
      readonly context: CheckoutBranchContextSnapshot;
    }
  | {
      readonly ok: true;
      readonly legacy: false;
      readonly assignment: NonNullable<CheckoutBranchContextSnapshot['assignment']>;
      readonly summary: CheckoutBranchAssignmentSummary;
      readonly context: CheckoutBranchContextSnapshot;
    }
  | {
      readonly ok: false;
      readonly error: CheckoutBranchPresentationError;
    };

const validateCheckoutQuery = (
  query: CheckoutBranchResolveQuery
): CheckoutBranchPresentationError | null => {
  if (!String(query.tenantId).trim()) {
    return checkoutInvalidQueryError('tenantId is required for checkout branch assignment');
  }

  if (query.orderType !== 'delivery' && query.orderType !== 'pickup') {
    return checkoutInvalidQueryError('orderType must be delivery or pickup');
  }

  if (query.cartItemIds && query.cartItemIds.length === 0) {
    return checkoutInvalidQueryError('cartItemIds cannot be empty when provided');
  }

  return null;
};

export async function resolveCheckoutBranch(
  query: CheckoutBranchResolveQuery,
  deps: CheckoutBranchFacadeDeps = {}
): Promise<CheckoutBranchResolveOutcome> {
  const resolved = createCheckoutBranchFacadeDeps(deps);
  setCheckoutBranchTelemetryHook(resolved.onTelemetry);

  const validationError = validateCheckoutQuery(query);
  if (validationError) {
    markCheckoutBranchError(validationError);
    completeCheckoutBranchTelemetry('error');
    recordCheckoutBranchFailureTelemetry(validationError.code);
    return { ok: false, error: validationError };
  }

  if (!resolved.isCheckoutBranchEnabled()) {
    const attemptId = createAttemptId();
    beginCheckoutBranchTelemetry(attemptId);
    const legacyContext = createLegacyCheckoutBranchContext();
    markCheckoutBranchLegacy(legacyContext);
    completeCheckoutBranchTelemetry('legacy');
    recordCheckoutBranchLegacyTelemetry();
    return {
      ok: true,
      legacy: true,
      assignment: null,
      summary: null,
      context: legacyContext,
    };
  }

  const branchDeps: BranchFacadeDeps = {
    ...resolved.branchFacade,
    readCustomerLocation:
      resolved.branchFacade.readCustomerLocation ?? resolved.readCustomerLocation,
  };

  const attemptId = createAttemptId();
  beginCheckoutBranchTelemetry(attemptId);
  markCheckoutBranchLoading(query, attemptId);

  const selectionQuery = buildCheckoutBranchSelectionQuery(query);
  const branchStartedAt = Date.now();
  const branchOutcome = await findBestBranch(selectionQuery, branchDeps);
  const branchMs = Date.now() - branchStartedAt;

  if (!branchOutcome.ok) {
    const error = mapBranchFacadeErrorToCheckout(branchOutcome.error);
    if (error.assignmentRejected) {
      markCheckoutBranchRejected(error);
      completeCheckoutBranchTelemetry('rejected', branchMs);
    } else {
      markCheckoutBranchError(error);
      completeCheckoutBranchTelemetry('error', branchMs);
    }
    recordCheckoutBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  const context = attachCheckoutBranchAssignment(
    branchOutcome.assignment,
    query.correlationId
  );
  markCheckoutBranchAssigned(context);
  completeCheckoutBranchTelemetry('assigned', branchMs);
  recordCheckoutBranchSuccessTelemetry(String(branchOutcome.assignment.branchId));

  return {
    ok: true,
    legacy: false,
    assignment: branchOutcome.assignment,
    summary: context.summary!,
    context,
  };
}

export async function retryCheckoutBranchAssignment(
  deps: CheckoutBranchFacadeDeps = {}
): Promise<CheckoutBranchResolveOutcome> {
  const lastQuery = getLastCheckoutBranchQuery();
  if (!lastQuery) {
    const error = checkoutInvalidQueryError('No prior checkout branch request to retry');
    markCheckoutBranchError(error);
    completeCheckoutBranchTelemetry('error');
    recordCheckoutBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  if (getCheckoutBranchRetryCount() >= DEFAULT_MAX_RETRIES) {
    const error = checkoutInvalidQueryError(
      'Maximum checkout branch retry attempts reached. Please try again later.'
    );
    markCheckoutBranchError(error);
    completeCheckoutBranchTelemetry('error');
    recordCheckoutBranchFailureTelemetry(error.code);
    return { ok: false, error };
  }

  markCheckoutBranchRetry();
  recordCheckoutBranchRetryTelemetry(getCheckoutBranchRetryCount());
  return resolveCheckoutBranch(lastQuery, deps);
}

export function cancelCheckoutBranchAssignment(): CheckoutBranchSessionSnapshot {
  recordCheckoutBranchCancelTelemetry();
  markCheckoutBranchCancelled();
  completeCheckoutBranchTelemetry('cancelled');
  return getCheckoutBranchSessionSnapshot();
}

export function clearCheckoutBranchSession(): void {
  resetCheckoutBranchSession();
  resetCheckoutBranchTelemetry();
}

export {
  getCheckoutBranchSessionSnapshot,
  subscribeCheckoutBranchSession,
  getCheckoutBranchTelemetrySnapshot,
  isCheckoutBranchEnabledDefault,
  createLegacyCheckoutBranchContext,
  attachCheckoutBranchAssignment,
  buildCheckoutBranchSelectionQuery,
};

export type {
  CheckoutBranchResolveQuery,
  CheckoutBranchContextSnapshot,
  CheckoutBranchAssignmentSummary,
  CheckoutBranchSessionSnapshot,
  CheckoutBranchTelemetryHook,
};

export {
  checkoutBranchDisabledError,
  normalizeCheckoutBranchError,
} from './CheckoutBranchErrorMapper';

export { CHECKOUT_BRANCH_FLAG, CHECKOUT_BRANCH_FLAG_ENV_KEY } from './CheckoutBranchContext';

/** Spec alias */
export const resetSession = clearCheckoutBranchSession;

/** Spec alias */
export const subscribeSession = subscribeCheckoutBranchSession;

/** Spec alias */
export const retry = retryCheckoutBranchAssignment;
