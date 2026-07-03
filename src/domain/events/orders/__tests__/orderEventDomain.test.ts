import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ORDER_EVENT_DOMAIN_VERSION, ORDER_EVENT_TYPES } from '../OrderEventSchema';
import { buildOrderCreatedPayload } from '../OrderCreatedEvent';
import { buildOrderUpdatedPayload } from '../OrderUpdatedEvent';
import { buildOrderCancelledPayload } from '../OrderCancelledEvent';
import {
  validateLegacyOrderDocument,
  validateOrderCreatedPayload,
  validateOrderEventEnvelopeFields,
  isValidOrderEventInput,
} from '../OrderEventValidation';

const sampleOrder = () => ({
  id: 'order-001',
  tenantId: 'tenant-001',
  userId: 'user-001',
  status: 'PLACED',
  totalAmount: 500,
  subtotal: 450,
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [{ menuItemId: 'item-1', name: 'Biryani', quantity: 2, lineTotal: 450 }],
  createdAt: '2026-06-26T18:00:00.000Z',
});

describe('Order event domain (M6 PR-5)', () => {
  it('exports ORDER_EVENT_DOMAIN_VERSION', () => {
    assert.equal(ORDER_EVENT_DOMAIN_VERSION, '0.1.0-order-events');
  });

  it('defines canonical order event types', () => {
    assert.equal(ORDER_EVENT_TYPES.CREATED, 'order.created.v1');
    assert.equal(ORDER_EVENT_TYPES.UPDATED, 'order.updated.v1');
    assert.equal(ORDER_EVENT_TYPES.CANCELLED, 'order.cancelled.v1');
  });

  it('buildOrderCreatedPayload maps legacy order', () => {
    const payload = buildOrderCreatedPayload(sampleOrder());
    assert.ok(payload);
    assert.equal(payload!.orderId, 'order-001');
    assert.equal(payload!.itemCount, 1);
    assert.equal(payload!.payloadVersion, '1.0.0');
  });

  it('buildOrderUpdatedPayload includes updated fields', () => {
    const payload = buildOrderUpdatedPayload(sampleOrder(), {
      previousStatus: 'PLACED',
      updatedFields: ['status', 'paymentStatus'],
    });
    assert.ok(payload);
    assert.equal(payload!.previousStatus, 'PLACED');
    assert.equal(payload!.updatedFields.length, 2);
  });

  it('buildOrderCancelledPayload includes cancellation reason', () => {
    const payload = buildOrderCancelledPayload(sampleOrder(), 'customer_request');
    assert.ok(payload);
    assert.equal(payload!.cancellationReason, 'customer_request');
  });

  it('validateLegacyOrderDocument rejects missing tenantId', () => {
    assert.ok(validateLegacyOrderDocument({ ...sampleOrder(), tenantId: '' }).length > 0);
  });

  it('validateOrderCreatedPayload requires matching itemCount', () => {
    const payload = buildOrderCreatedPayload(sampleOrder())!;
    const invalid = { ...payload, itemCount: 99 };
    assert.ok(validateOrderCreatedPayload(invalid).length > 0);
  });

  it('validateOrderEventEnvelopeFields requires semver schemaVersion', () => {
    assert.ok(
      validateOrderEventEnvelopeFields({
        aggregateId: 'order-001',
        tenantId: 'tenant-001',
        correlationId: 'corr-001',
        schemaVersion: '1.0.0',
        occurredAt: '2026-06-26T18:00:00.000Z',
      }).length === 0
    );
  });

  it('isValidOrderEventInput validates order and context', () => {
    assert.equal(
      isValidOrderEventInput(sampleOrder(), { correlationId: 'corr-001' }),
      true
    );
    assert.equal(isValidOrderEventInput(sampleOrder(), { correlationId: '' }), false);
  });
});
