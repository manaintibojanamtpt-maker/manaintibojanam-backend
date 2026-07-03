/**
 * M5 PR-13 — Owner branch query builders for BranchFacade.
 */

import type {
  OwnerBranchEtaQuery,
  OwnerBranchGetQuery,
  OwnerBranchListQuery,
  OwnerBranchOperationalAvailabilityQuery,
  OwnerBranchValidateQuery,
} from './types';
import type {
  BranchEtaFacadeQuery,
  BranchGetFacadeQuery,
  BranchListFacadeQuery,
  BranchOperationsAvailabilityFacadeQuery,
  BranchValidateFacadeQuery,
} from '../branch/types';

export function buildOwnerBranchListQuery(
  query: OwnerBranchListQuery
): BranchListFacadeQuery {
  return {
    tenantId: query.tenantId,
    includeInactive: query.includeInactive,
    limit: query.limit,
  };
}

export function buildOwnerBranchGetQuery(query: OwnerBranchGetQuery): BranchGetFacadeQuery {
  return {
    branchId: query.branchId,
  };
}

export function buildOwnerBranchOperationalAvailabilityQuery(
  query: OwnerBranchOperationalAvailabilityQuery
): BranchOperationsAvailabilityFacadeQuery {
  return {
    branchId: query.branchId,
    tenantId: query.tenantId,
    branchName: query.branchName,
    cartItemIds: query.cartItemIds,
    evaluatedAt: query.evaluatedAt,
    correlationId: query.correlationId,
  };
}

export function buildOwnerBranchValidateQuery(
  query: OwnerBranchValidateQuery
): BranchValidateFacadeQuery {
  return {
    tenantId: query.tenantId,
    branchId: query.branchId,
    orderType: query.orderType,
    customerPoint: query.customerPoint,
    cartItemIds: query.cartItemIds,
  };
}

export function buildOwnerBranchEtaQuery(query: OwnerBranchEtaQuery): BranchEtaFacadeQuery {
  return {
    tenantId: query.tenantId,
    branchId: query.branchId,
    orderType: query.orderType,
    customerPoint: query.customerPoint,
  };
}
