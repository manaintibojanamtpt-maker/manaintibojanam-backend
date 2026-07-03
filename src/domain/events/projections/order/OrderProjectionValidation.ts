/** Order read projection validation (M6 PR-7). Pure domain — no SDK imports. */

import type { OrderProjectionReadModel } from './OrderProjectionState';
import { isSupportedOrderProjectionEvent } from './OrderProjectionMetadata';

const FORBIDDEN_PII_FIELDS = ['phone', 'email', 'customerName', 'address'] as const;

export function validateOrderProjectionReadModel(
  model: OrderProjectionReadModel
): readonly string[] {
  const errors: string[] = [];
  if (!model.orderId) errors.push('orderId is required');
  if (!model.tenantId) errors.push('tenantId is required');
  if (!model.status) errors.push('status is required');
  if (!model.currency) errors.push('currency is required');
  if (!model.createdAt) errors.push('createdAt is required');
  if (!model.updatedAt) errors.push('updatedAt is required');
  if (!model.version) errors.push('version is required');
  if (!model.projectionVersion) errors.push('projectionVersion is required');
  return errors;
}

export function validateOrderProjectionEventType(eventType: string): readonly string[] {
  if (!isSupportedOrderProjectionEvent(eventType)) {
    return [`Unsupported order projection event: ${eventType}`];
  }
  return [];
}

export function assertNoPiiInReadModel(
  record: Record<string, unknown>
): readonly string[] {
  const errors: string[] = [];
  for (const field of FORBIDDEN_PII_FIELDS) {
    if (field in record && record[field] !== undefined) {
      errors.push(`PII field forbidden in read model: ${field}`);
    }
  }
  return errors;
}

export function canApplyUpdate(existing: OrderProjectionReadModel | null): boolean {
  return existing !== null;
}

export function canApplyCancel(existing: OrderProjectionReadModel | null): boolean {
  return existing !== null;
}
