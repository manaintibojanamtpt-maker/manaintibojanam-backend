/** Order event validation (M6 PR-5). Pure domain — no SDK imports. */

import type { LegacyOrderDocument, OrderEventPublishContext } from './OrderEventMetadata';
import type { OrderCreatedPayload } from './OrderCreatedEvent';
import type { OrderUpdatedPayload } from './OrderUpdatedEvent';
import type { OrderCancelledPayload } from './OrderCancelledEvent';
import { ORDER_EVENT_SCHEMA_VERSION } from './OrderEventSchema';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export function validateLegacyOrderDocument(order: LegacyOrderDocument): readonly string[] {
  const errors: string[] = [];
  if (!order.id) errors.push('order.id is required');
  if (!order.tenantId) errors.push('order.tenantId is required');
  if (!order.status) errors.push('order.status is required');
  return errors;
}

export function validateOrderEventPublishContext(context: OrderEventPublishContext): readonly string[] {
  const errors: string[] = [];
  if (!context.correlationId) errors.push('correlationId is required');
  return errors;
}

export function validateOrderCreatedPayload(payload: OrderCreatedPayload): readonly string[] {
  const errors: string[] = [];
  if (!payload.orderId) errors.push('payload.orderId is required');
  if (!payload.tenantId) errors.push('payload.tenantId is required');
  if (!payload.status) errors.push('payload.status is required');
  if (!payload.payloadVersion) errors.push('payload.payloadVersion is required');
  if (payload.itemCount !== payload.items.length) {
    errors.push('payload.itemCount must match items.length');
  }
  return errors;
}

export function validateOrderUpdatedPayload(payload: OrderUpdatedPayload): readonly string[] {
  const errors: string[] = [];
  if (!payload.orderId) errors.push('payload.orderId is required');
  if (!payload.tenantId) errors.push('payload.tenantId is required');
  if (!payload.status) errors.push('payload.status is required');
  if (!payload.updatedFields.length) errors.push('payload.updatedFields must not be empty');
  return errors;
}

export function validateOrderCancelledPayload(payload: OrderCancelledPayload): readonly string[] {
  const errors: string[] = [];
  if (!payload.orderId) errors.push('payload.orderId is required');
  if (!payload.tenantId) errors.push('payload.tenantId is required');
  return errors;
}

export function validateSchemaVersion(version: string): readonly string[] {
  if (!version || !SEMVER_PATTERN.test(version)) {
    return [`schemaVersion must be semver (got: ${version ?? 'empty'})`];
  }
  return [];
}

export function validateOrderEventEnvelopeFields(input: {
  aggregateId: string;
  tenantId: string;
  correlationId: string;
  schemaVersion: string;
  occurredAt: string;
}): readonly string[] {
  const errors: string[] = [];
  if (!input.aggregateId) errors.push('aggregateId is required');
  if (!input.tenantId) errors.push('tenantId is required');
  if (!input.correlationId) errors.push('correlationId is required');
  if (!input.occurredAt) errors.push('occurredAt is required');
  errors.push(...validateSchemaVersion(input.schemaVersion));
  if (input.schemaVersion && input.schemaVersion !== ORDER_EVENT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${ORDER_EVENT_SCHEMA_VERSION} for v1 order events`);
  }
  return errors;
}

export function isValidOrderEventInput(
  order: LegacyOrderDocument,
  context: OrderEventPublishContext
): boolean {
  return (
    validateLegacyOrderDocument(order).length === 0 &&
    validateOrderEventPublishContext(context).length === 0
  );
}
