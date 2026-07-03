/**
 * M5 PR-9 — Order branch persistence orchestration.
 * Consumes CheckoutBranchContextSnapshot at order creation — no BranchSDK, no reassignment.
 */

import type { CheckoutBranchContextSnapshot } from '../checkout/CheckoutBranchContext';
import {
  isLegacyOrderBranchFields,
  mapCheckoutContextToOrderBranchFields,
  mergeOrderBranchFields,
  type OrderBranchMappedFields,
  type OrderBranchPersistenceFields,
} from './OrderBranchMapper';
import {
  beginOrderBranchTelemetry,
  completeOrderBranchTelemetry,
  recordOrderBranchPersistFailure,
  recordOrderBranchPersistRequest,
  recordOrderBranchPersistSkipped,
  recordOrderBranchPersistSuccess,
  resetOrderBranchTelemetry,
  setOrderBranchTelemetryHook,
  type OrderBranchTelemetryHook,
} from './OrderBranchTelemetry';
import {
  validateOrderBranchPersistenceInput,
  type OrderBranchValidationError,
} from './OrderBranchValidation';

export const ORDER_BRANCH_PERSISTENCE_FLAG = 'FF_BRANCH_ORDER_PERSISTENCE_ENABLED' as const;
export const ORDER_BRANCH_PERSISTENCE_FLAG_ENV_KEY =
  'VITE_FF_BRANCH_ORDER_PERSISTENCE_ENABLED';

export interface OrderBranchPersistenceInput {
  readonly tenantId: string;
  readonly checkoutContext: CheckoutBranchContextSnapshot;
}

export interface OrderBranchPersistenceSuccess {
  readonly ok: true;
  readonly legacy: boolean;
  readonly fields: OrderBranchMappedFields;
  readonly enrichedOrder: Record<string, unknown>;
}

export interface OrderBranchPersistenceFailure {
  readonly ok: false;
  readonly error: OrderBranchValidationError;
}

export type OrderBranchPersistenceOutcome =
  | OrderBranchPersistenceSuccess
  | OrderBranchPersistenceFailure;

export interface OrderBranchPersistenceSkipped {
  readonly ok: true;
  readonly skipped: true;
  readonly enrichedOrder: Record<string, unknown>;
}

export type OrderBranchPersistenceResult =
  | OrderBranchPersistenceSuccess
  | OrderBranchPersistenceFailure
  | OrderBranchPersistenceSkipped;

export interface OrderBranchWritePort {
  readonly writeBranchMetadata: (
    orderId: string,
    fields: OrderBranchPersistenceFields | { readonly branchId: string; readonly legacy: true }
  ) => Promise<void>;
}

export interface OrderBranchPersistenceOptions {
  readonly isEnabled?: () => boolean;
  readonly onTelemetry?: OrderBranchTelemetryHook;
  readonly requireAssignment?: boolean;
}

export function isOrderBranchPersistenceEnabledDefault(): boolean {
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env[ORDER_BRANCH_PERSISTENCE_FLAG_ENV_KEY]
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
        const localOverride = localStorage.getItem(ORDER_BRANCH_PERSISTENCE_FLAG);
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

export function resolveOrderBranchPersistence(
  orderData: Record<string, unknown>,
  input: OrderBranchPersistenceInput,
  options: OrderBranchPersistenceOptions = {}
): OrderBranchPersistenceResult {
  const isEnabled = options.isEnabled ?? isOrderBranchPersistenceEnabledDefault;
  setOrderBranchTelemetryHook(options.onTelemetry);

  if (!isEnabled()) {
    recordOrderBranchPersistSkipped(String(input.tenantId));
    return {
      ok: true,
      skipped: true,
      enrichedOrder: orderData,
    };
  }

  beginOrderBranchTelemetry();
  recordOrderBranchPersistRequest(String(input.tenantId), input.checkoutContext.legacy);

  const validationError = validateOrderBranchPersistenceInput({
    tenantId: input.tenantId,
    checkoutContext: input.checkoutContext,
    requireAssignment: options.requireAssignment,
  });

  if (validationError) {
    recordOrderBranchPersistFailure(String(input.tenantId), validationError.code);
    completeOrderBranchTelemetry();
    return { ok: false, error: validationError };
  }

  const fields = mapCheckoutContextToOrderBranchFields(input.tenantId, input.checkoutContext);
  const legacy = isLegacyOrderBranchFields(fields);
  const enrichedOrder = mergeOrderBranchFields(orderData, fields);

  recordOrderBranchPersistSuccess(String(input.tenantId), fields.branchId, legacy);
  completeOrderBranchTelemetry();

  return {
    ok: true,
    legacy,
    fields,
    enrichedOrder,
  };
}

export async function persistOrderBranchMetadata(
  orderId: string,
  orderData: Record<string, unknown>,
  input: OrderBranchPersistenceInput,
  writePort: OrderBranchWritePort,
  options: OrderBranchPersistenceOptions = {}
): Promise<OrderBranchPersistenceResult> {
  const result = resolveOrderBranchPersistence(orderData, input, options);

  if (!result.ok) {
    return result;
  }

  if ('skipped' in result && result.skipped) {
    return result;
  }

  await writePort.writeBranchMetadata(orderId, result.fields);
  return result;
}

export {
  mapCheckoutContextToOrderBranchFields,
  mergeOrderBranchFields,
  buildOrderBranchAssignmentSummary,
  ORDER_BRANCH_ASSIGNMENT_ALGORITHM_VERSION,
  ORDER_BRANCH_POLICY_VERSION,
} from './OrderBranchMapper';

export {
  validateOrderBranchPersistenceInput,
  validateLegacyCheckoutContext,
} from './OrderBranchValidation';

export {
  getOrderBranchTelemetrySnapshot,
  resetOrderBranchTelemetry,
  setOrderBranchTelemetryHook,
};

export type {
  OrderBranchPersistenceFields,
  OrderBranchMappedFields,
  OrderBranchLegacyFields,
} from './OrderBranchMapper';

export type { OrderBranchValidationError } from './OrderBranchValidation';
export type { OrderBranchTelemetryHook, OrderBranchTelemetryEvent } from './OrderBranchTelemetry';
