/**
 * M5 PR-8 — Build checkout branch inputs and in-memory assignment context.
 */

import type { BranchAssignment } from '../../sdk/branch/dto';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { TenantId } from '../../sdk/core/types';
import type { BranchSelectionFacadeQuery } from '../branch/types';

export const CHECKOUT_BRANCH_FLAG = 'FF_BRANCH_CHECKOUT_ENABLED' as const;
export const CHECKOUT_BRANCH_FLAG_ENV_KEY = 'VITE_FF_BRANCH_CHECKOUT_ENABLED';

export interface CheckoutBranchResolveQuery {
  readonly tenantId: TenantId;
  readonly orderType: BranchSelectionFacadeQuery['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly cartItemIds?: readonly string[];
  readonly preferredBranchId?: BranchId;
  readonly excludeBranchIds?: readonly BranchId[];
  readonly correlationId?: string;
}

export interface CheckoutBranchAssignmentSummary {
  readonly assignmentId: BranchAssignment['assignmentId'];
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly reason: BranchAssignment['reason'];
  readonly scoreTotal?: number;
  readonly isEligible: boolean;
  readonly overrideApplied: boolean;
}

export interface CheckoutBranchContextSnapshot {
  readonly assignment: BranchAssignment | null;
  readonly summary: CheckoutBranchAssignmentSummary | null;
  readonly resolvedAt: number | null;
  readonly correlationId: string | null;
  readonly legacy: boolean;
}

export const EMPTY_CHECKOUT_BRANCH_CONTEXT: CheckoutBranchContextSnapshot = {
  assignment: null,
  summary: null,
  resolvedAt: null,
  correlationId: null,
  legacy: true,
};

export function buildCheckoutBranchSelectionQuery(
  query: CheckoutBranchResolveQuery
): BranchSelectionFacadeQuery {
  return {
    tenantId: query.tenantId,
    orderType: query.orderType,
    customerPoint: query.customerPoint,
    cartItemIds: query.cartItemIds,
    preferredBranchId: query.preferredBranchId,
    excludeBranchIds: query.excludeBranchIds,
    correlationId: query.correlationId,
  };
}

export function buildCheckoutBranchAssignmentSummary(
  assignment: BranchAssignment
): CheckoutBranchAssignmentSummary {
  return {
    assignmentId: assignment.assignmentId,
    tenantId: assignment.tenantId,
    branchId: assignment.branchId,
    branchName: assignment.branchName,
    reason: assignment.reason,
    scoreTotal: assignment.score?.total,
    isEligible: assignment.eligibility.isEligible,
    overrideApplied: assignment.overrideApplied,
  };
}

export function attachCheckoutBranchAssignment(
  assignment: BranchAssignment,
  correlationId?: string
): CheckoutBranchContextSnapshot {
  return {
    assignment,
    summary: buildCheckoutBranchAssignmentSummary(assignment),
    resolvedAt: Date.now(),
    correlationId: correlationId ?? null,
    legacy: false,
  };
}

export function createLegacyCheckoutBranchContext(): CheckoutBranchContextSnapshot {
  return { ...EMPTY_CHECKOUT_BRANCH_CONTEXT };
}

export function isCheckoutBranchEnabledDefault(): boolean {
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env[CHECKOUT_BRANCH_FLAG_ENV_KEY]
      : undefined;

  if (envValue === 'true') {
    return true;
  }
  if (envValue === 'false') {
    return false;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const isDev =
      import.meta.env.DEV === true || import.meta.env.VITE_APP_ENV === 'development';
    const isPreview = import.meta.env.VITE_APP_ENV === 'preview';
    if (isDev || isPreview) {
      try {
        const localOverride = localStorage.getItem(CHECKOUT_BRANCH_FLAG);
        if (localOverride === 'true') {
          return true;
        }
        if (localOverride === 'false') {
          return false;
        }
      } catch {
        // ignore localStorage errors
      }
    }
  }

  return false;
}
