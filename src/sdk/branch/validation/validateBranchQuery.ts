/**
 * BranchSDK — structural query validation (M5 PR-1 foundation).
 * No business logic — required field checks only.
 */

import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type {
  BranchAssignmentRequest,
  BranchEligibilityQuery,
  BranchETAInput,
  BranchListFilter,
  BranchOverrideRequest,
  BranchSelectionQuery,
  BranchValidationInput,
} from '../dto';
import { BRANCH_ERROR_MESSAGES } from '../errors/branchErrors';

const isValidPoint = (point: { lat: number; lng: number } | undefined): boolean =>
  Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat !== 0 &&
      point.lng !== 0
  );

const validateTenantId = (tenantId: string | undefined): SdkResult<string> => {
  const trimmed = tenantId?.trim();
  if (!trimmed) {
    return sdkFail(sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'tenantId' }));
  }
  return sdkOk(trimmed);
};

export const validateBranchSelectionQuery = (
  query: BranchSelectionQuery
): SdkResult<BranchSelectionQuery> => {
  const tenant = validateTenantId(String(query.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  if (!isValidPoint(query.customerPoint)) {
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' })
    );
  }

  if (query.orderType !== 'delivery' && query.orderType !== 'pickup') {
    return sdkFail(sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'orderType' }));
  }

  return sdkOk(query);
};

export const validateBranchEligibilityQuery = (
  query: BranchEligibilityQuery
): SdkResult<BranchEligibilityQuery> => {
  const tenant = validateTenantId(String(query.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  if (!isValidPoint(query.customerPoint)) {
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' })
    );
  }

  return sdkOk(query);
};

export const validateBranchListFilter = (filter: BranchListFilter): SdkResult<BranchListFilter> => {
  const tenant = validateTenantId(String(filter.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  return sdkOk(filter);
};

export const validateBranchAssignmentRequest = (
  request: BranchAssignmentRequest
): SdkResult<BranchAssignmentRequest> => {
  const tenant = validateTenantId(String(request.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  if (!request.branchId?.trim()) {
    return sdkFail(sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'branchId' }));
  }

  if (!isValidPoint(request.customerPoint)) {
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' })
    );
  }

  return sdkOk(request);
};

export const validateBranchOverrideRequest = (
  request: BranchOverrideRequest
): SdkResult<BranchOverrideRequest> => {
  const tenant = validateTenantId(String(request.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  if (!request.branchId?.trim()) {
    return sdkFail(sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'branchId' }));
  }

  if (!isValidPoint(request.customerPoint)) {
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' })
    );
  }

  return sdkOk(request);
};

export const validateBranchETAInput = (input: BranchETAInput): SdkResult<BranchETAInput> => {
  const tenant = validateTenantId(String(input.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  if (!input.branchId?.trim()) {
    return sdkFail(sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'branchId' }));
  }

  if (!isValidPoint(input.customerPoint)) {
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' })
    );
  }

  return sdkOk(input);
};

export const validateBranchValidationInput = (
  input: BranchValidationInput
): SdkResult<BranchValidationInput> => {
  const tenant = validateTenantId(String(input.tenantId));
  if (!tenant.ok) {
    return tenant;
  }

  if (!input.branchId?.trim()) {
    return sdkFail(sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'branchId' }));
  }

  if (!isValidPoint(input.customerPoint)) {
    return sdkFail(
      sdkError('VALIDATION', BRANCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' })
    );
  }

  return sdkOk(input);
};
