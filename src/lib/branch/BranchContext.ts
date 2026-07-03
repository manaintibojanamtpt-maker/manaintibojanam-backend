/**
 * M5 PR-5 — Build BranchSDK inputs from facade query + customer location.
 */

import type { SdkResult } from '../../sdk/core/result';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type {
  BranchEligibilityQuery,
  BranchETAInput,
  BranchListFilter,
  BranchSelectionQuery,
  BranchValidationInput,
} from '../../sdk/branch/dto';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { TenantId } from '../../sdk/core/types';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import type {
  BranchEligibilityFacadeQuery,
  BranchEtaFacadeQuery,
  BranchListFacadeQuery,
  BranchSelectionFacadeQuery,
  BranchValidateFacadeQuery,
} from './types';

export interface BranchContextInput<TQuery> {
  readonly facadeQuery: TQuery;
  readonly customerLocation: CustomerCanonicalLocation | null;
}

export interface BranchContextMeta {
  readonly usedCustomerSession: boolean;
}

export interface BuiltBranchListContext {
  readonly filter: BranchListFilter;
  readonly meta: BranchContextMeta;
}

export interface BuiltBranchEligibilityContext {
  readonly query: BranchEligibilityQuery;
  readonly meta: BranchContextMeta;
}

export interface BuiltBranchValidationContext {
  readonly input: BranchValidationInput;
  readonly meta: BranchContextMeta;
}

export interface BuiltBranchEtaContext {
  readonly input: BranchETAInput;
  readonly meta: BranchContextMeta;
}

export interface BuiltBranchSelectionContext {
  readonly query: BranchSelectionQuery;
  readonly meta: BranchContextMeta;
}

export function buildBranchListContext(
  input: BranchContextInput<BranchListFacadeQuery>
): SdkResult<BuiltBranchListContext> {
  const tenantId = input.facadeQuery.tenantId;
  if (!String(tenantId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'tenantId is required', { field: 'tenantId' }));
  }

  return sdkOk({
    filter: {
      tenantId: tenantId as TenantId,
      status: input.facadeQuery.status,
      includeInactive: input.facadeQuery.includeInactive,
      limit: input.facadeQuery.limit,
    },
    meta: { usedCustomerSession: false },
  });
}

export function buildBranchEligibilityContext(
  input: BranchContextInput<BranchEligibilityFacadeQuery>
): SdkResult<BuiltBranchEligibilityContext> {
  const tenantId = input.facadeQuery.tenantId;
  if (!String(tenantId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'tenantId is required', { field: 'tenantId' }));
  }

  const point = resolveCustomerPoint(input.facadeQuery.customerPoint, input.customerLocation);
  if (!point.ok) {
    return point;
  }

  return sdkOk({
    query: {
      tenantId: tenantId as TenantId,
      customerPoint: point.value,
      orderType: input.facadeQuery.orderType,
      includeClosed: input.facadeQuery.includeClosed,
      limit: input.facadeQuery.limit,
    },
    meta: {
      usedCustomerSession:
        !input.facadeQuery.customerPoint && input.customerLocation !== null,
    },
  });
}

export function buildBranchValidationContext(
  input: BranchContextInput<BranchValidateFacadeQuery>
): SdkResult<BuiltBranchValidationContext> {
  const tenantId = input.facadeQuery.tenantId;
  if (!String(tenantId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'tenantId is required', { field: 'tenantId' }));
  }

  if (!String(input.facadeQuery.branchId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'branchId is required', { field: 'branchId' }));
  }

  const point = resolveCustomerPoint(input.facadeQuery.customerPoint, input.customerLocation);
  if (!point.ok) {
    return point;
  }

  return sdkOk({
    input: {
      tenantId: tenantId as TenantId,
      branchId: input.facadeQuery.branchId as BranchId,
      customerPoint: point.value,
      orderType: input.facadeQuery.orderType,
      cartItemIds: input.facadeQuery.cartItemIds,
    },
    meta: {
      usedCustomerSession:
        !input.facadeQuery.customerPoint && input.customerLocation !== null,
    },
  });
}

export function buildBranchEtaContext(
  input: BranchContextInput<BranchEtaFacadeQuery>
): SdkResult<BuiltBranchEtaContext> {
  const tenantId = input.facadeQuery.tenantId;
  if (!String(tenantId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'tenantId is required', { field: 'tenantId' }));
  }

  if (!String(input.facadeQuery.branchId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'branchId is required', { field: 'branchId' }));
  }

  const point = resolveCustomerPoint(input.facadeQuery.customerPoint, input.customerLocation);
  if (!point.ok) {
    return point;
  }

  return sdkOk({
    input: {
      tenantId: tenantId as TenantId,
      branchId: input.facadeQuery.branchId as BranchId,
      customerPoint: point.value,
      orderType: input.facadeQuery.orderType,
    },
    meta: {
      usedCustomerSession:
        !input.facadeQuery.customerPoint && input.customerLocation !== null,
    },
  });
}

export function buildBranchSelectionContext(
  input: BranchContextInput<BranchSelectionFacadeQuery>
): SdkResult<BuiltBranchSelectionContext> {
  const tenantId = input.facadeQuery.tenantId;
  if (!String(tenantId).trim()) {
    return sdkFail(sdkError('VALIDATION', 'tenantId is required', { field: 'tenantId' }));
  }

  const point = resolveCustomerPoint(input.facadeQuery.customerPoint, input.customerLocation);
  if (!point.ok) {
    return point;
  }

  return sdkOk({
    query: {
      tenantId: tenantId as TenantId,
      customerPoint: point.value,
      customerGeohash: input.customerLocation?.geohash,
      orderType: input.facadeQuery.orderType,
      cartItemIds: input.facadeQuery.cartItemIds,
      preferredBranchId: input.facadeQuery.preferredBranchId,
      excludeBranchIds: input.facadeQuery.excludeBranchIds,
      correlationId: input.facadeQuery.correlationId,
    },
    meta: {
      usedCustomerSession:
        !input.facadeQuery.customerPoint && input.customerLocation !== null,
    },
  });
}

const resolveCustomerPoint = (
  override: { readonly lat: number; readonly lng: number } | undefined,
  customerLocation: CustomerCanonicalLocation | null
): SdkResult<{ lat: number; lng: number }> => {
  if (override) {
    const { lat, lng } = override;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      return sdkFail(sdkError('VALIDATION', 'Invalid customer coordinates override'));
    }
    return sdkOk({ lat, lng });
  }

  if (!customerLocation) {
    return sdkFail(
      sdkError('VALIDATION', 'Customer location is required for branch requests', {
        field: 'customerPoint',
      })
    );
  }

  if (!Number.isFinite(customerLocation.lat) || !Number.isFinite(customerLocation.lng)) {
    return sdkFail(sdkError('VALIDATION', 'Stored customer location has invalid coordinates'));
  }

  return sdkOk({ lat: customerLocation.lat, lng: customerLocation.lng });
};
