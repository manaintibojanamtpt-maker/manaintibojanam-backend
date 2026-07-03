/**
 * M5 PR-9 — Order branch persistence types and field mapping.
 * Maps CheckoutBranchContextSnapshot → order persistence fields. No BranchSDK calls.
 */

import { BRANCH_ASSIGNMENT_METADATA_VERSION } from '../../domain/branch/assignment/BranchAssignmentMetadata';
import { BRANCH_DOMAIN_VERSION } from '../../domain/branch/shared/BranchConstants';
import type { BranchAssignmentReason } from '../../sdk/branch/dto/queries';
import type { CheckoutBranchContextSnapshot } from '../checkout/CheckoutBranchContext';

export const ORDER_BRANCH_ASSIGNMENT_ALGORITHM_VERSION = BRANCH_DOMAIN_VERSION;
export const ORDER_BRANCH_POLICY_VERSION = BRANCH_ASSIGNMENT_METADATA_VERSION;

export interface OrderBranchPersistenceFields {
  readonly branchId: string;
  readonly assignmentId: string;
  readonly assignmentReason: BranchAssignmentReason;
  readonly branchName?: string;
  readonly algorithmVersion: string;
  readonly policyVersion: string;
  readonly generatedAt: number;
}

export interface OrderBranchLegacyFields {
  readonly branchId: string;
  readonly legacy: true;
}

export type OrderBranchMappedFields = OrderBranchPersistenceFields | OrderBranchLegacyFields;

export const isLegacyOrderBranchFields = (
  fields: OrderBranchMappedFields
): fields is OrderBranchLegacyFields => 'legacy' in fields && fields.legacy === true;

export function mapCheckoutContextToOrderBranchFields(
  tenantId: string,
  context: CheckoutBranchContextSnapshot
): OrderBranchPersistenceFields | OrderBranchLegacyFields {
  if (context.legacy || !context.assignment || !context.summary) {
    return {
      branchId: tenantId,
      legacy: true,
    };
  }

  const { assignment, summary, resolvedAt } = context;

  return {
    branchId: String(summary.branchId),
    assignmentId: String(summary.assignmentId),
    assignmentReason: summary.reason,
    branchName: summary.branchName,
    algorithmVersion: ORDER_BRANCH_ASSIGNMENT_ALGORITHM_VERSION,
    policyVersion: ORDER_BRANCH_POLICY_VERSION,
    generatedAt: resolvedAt ?? assignment.assignedAt ?? Date.now(),
  };
}

export function mergeOrderBranchFields<T extends Record<string, unknown>>(
  orderData: T,
  fields: OrderBranchMappedFields | null
): T {
  if (!fields) {
    return orderData;
  }

  if (isLegacyOrderBranchFields(fields)) {
    return {
      ...orderData,
      branchId: fields.branchId,
    };
  }

  return {
    ...orderData,
    branchId: fields.branchId,
    branchAssignmentId: fields.assignmentId,
    branchName: fields.branchName,
    branchAssignmentReason: fields.assignmentReason,
    branchAssignmentAlgorithmVersion: fields.algorithmVersion,
    branchAssignmentPolicyVersion: fields.policyVersion,
    branchAssignmentGeneratedAt: fields.generatedAt,
  };
}

export function buildOrderBranchAssignmentSummary(fields: OrderBranchPersistenceFields) {
  return {
    branchId: fields.branchId,
    assignmentId: fields.assignmentId,
    reason: fields.assignmentReason,
    branchName: fields.branchName,
    algorithmVersion: fields.algorithmVersion,
    policyVersion: fields.policyVersion,
    generatedAt: fields.generatedAt,
  };
}
