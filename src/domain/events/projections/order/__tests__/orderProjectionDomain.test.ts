import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOrderProjectionFromCreated,
  applyOrderProjectionUpdated,
  applyOrderProjectionCancelled,
  resolveOrderProjectionTransition,
} from '../OrderProjectionBuilders';
import {
  validateOrderProjectionReadModel,
  validateOrderProjectionEventType,
  assertNoPiiInReadModel,
  canApplyUpdate,
  canApplyCancel,
} from '../OrderProjectionValidation';
import {
  ORDER_READ_PROJECTION_NAME,
  ORDER_READ_PROJECTION_VERSION,
  ORDER_READ_PROJECTION_CONSUMER_GROUP,
  DEFAULT_ORDER_CURRENCY,
  SUPPORTED_ORDER_PROJECTION_EVENTS,
  isSupportedOrderProjectionEvent,
} from '../OrderProjectionMetadata';
import { ORDER_EVENT_TYPES } from '../../../orders/OrderEventSchema';

const createdPayload = () => ({
  orderId: 'order-domain-001',
  tenantId: 'tenant-domain-001',
  userId: 'user-domain-001',
  status: 'PLACED',
  totalAmount: 500,
  itemCount: 1,
  items: [],
  payloadVersion: '1.0.0',
});

const eventContext = () => ({
  eventId: 'evt-domain-001',
  eventType: ORDER_EVENT_TYPES.CREATED,
  schemaVersion: '1.0.0',
  occurredAt: '2026-06-26T20:00:00.000Z',
  branchId: 'branch-001',
});

describe('Order projection domain (M6 PR-7)', () => {
  it('exports projection identity metadata', () => {
    assert.equal(ORDER_READ_PROJECTION_NAME, 'order-read-shadow');
    assert.equal(ORDER_READ_PROJECTION_VERSION, '1.0.0');
    assert.equal(ORDER_READ_PROJECTION_CONSUMER_GROUP, 'order-read-shadow');
    assert.equal(DEFAULT_ORDER_CURRENCY, 'INR');
    assert.equal(SUPPORTED_ORDER_PROJECTION_EVENTS.length, 3);
  });

  it('isSupportedOrderProjectionEvent recognizes order events', () => {
    assert.equal(isSupportedOrderProjectionEvent(ORDER_EVENT_TYPES.CREATED), true);
    assert.equal(isSupportedOrderProjectionEvent('menu.item.created.v1'), false);
  });

  it('buildOrderProjectionFromCreated builds read model without PII', () => {
    const model = buildOrderProjectionFromCreated(createdPayload(), {
      ...eventContext(),
      eventType: ORDER_EVENT_TYPES.CREATED,
    });
    assert.equal(model.orderId, 'order-domain-001');
    assert.equal(model.tenantId, 'tenant-domain-001');
    assert.equal(model.customerId, 'user-domain-001');
    assert.equal(model.branchId, 'branch-001');
    assert.equal(model.currency, 'INR');
    assert.equal(model.projectionVersion, '1.0.0');
  });

  it('applyOrderProjectionUpdated updates status and totalAmount', () => {
    const current = buildOrderProjectionFromCreated(createdPayload(), {
      ...eventContext(),
      eventType: ORDER_EVENT_TYPES.CREATED,
    });
    const updated = applyOrderProjectionUpdated(
      current,
      {
        orderId: 'order-domain-001',
        tenantId: 'tenant-domain-001',
        status: 'CONFIRMED',
        totalAmount: 600,
        payloadVersion: '1.0.0',
      },
      {
        ...eventContext(),
        eventType: ORDER_EVENT_TYPES.UPDATED,
        occurredAt: '2026-06-26T20:05:00.000Z',
      }
    );
    assert.equal(updated.status, 'CONFIRMED');
    assert.equal(updated.totalAmount, 600);
    assert.equal(updated.updatedAt, '2026-06-26T20:05:00.000Z');
  });

  it('applyOrderProjectionCancelled sets cancelled status', () => {
    const current = buildOrderProjectionFromCreated(createdPayload(), {
      ...eventContext(),
      eventType: ORDER_EVENT_TYPES.CREATED,
    });
    const cancelled = applyOrderProjectionCancelled(
      current,
      {
        orderId: 'order-domain-001',
        tenantId: 'tenant-domain-001',
        status: 'CANCELLED',
        payloadVersion: '1.0.0',
      },
      {
        ...eventContext(),
        eventType: ORDER_EVENT_TYPES.CANCELLED,
        occurredAt: '2026-06-26T20:10:00.000Z',
      }
    );
    assert.equal(cancelled.status, 'CANCELLED');
  });

  it('resolveOrderProjectionTransition maps event types', () => {
    assert.equal(resolveOrderProjectionTransition(ORDER_EVENT_TYPES.CREATED), 'create');
    assert.equal(resolveOrderProjectionTransition(ORDER_EVENT_TYPES.UPDATED), 'update');
    assert.equal(resolveOrderProjectionTransition(ORDER_EVENT_TYPES.CANCELLED), 'cancel');
    assert.equal(resolveOrderProjectionTransition('unknown.v1'), 'unsupported');
  });

  it('validateOrderProjectionReadModel rejects incomplete model', () => {
    const errors = validateOrderProjectionReadModel({
      orderId: '',
      tenantId: '',
      status: '',
      currency: '',
      createdAt: '',
      updatedAt: '',
      version: '',
      projectionVersion: '',
    });
    assert.ok(errors.length > 0);
  });

  it('validateOrderProjectionEventType rejects unsupported events', () => {
    const errors = validateOrderProjectionEventType('menu.item.created.v1');
    assert.equal(errors.length, 1);
  });

  it('assertNoPiiInReadModel rejects forbidden fields', () => {
    const errors = assertNoPiiInReadModel({
      orderId: 'x',
      phone: '9999999999',
    });
    assert.ok(errors.some((e) => e.includes('phone')));
  });

  it('canApplyUpdate and canApplyCancel require existing model', () => {
    assert.equal(canApplyUpdate(null), false);
    assert.equal(canApplyCancel(null), false);
    const model = buildOrderProjectionFromCreated(createdPayload(), {
      ...eventContext(),
      eventType: ORDER_EVENT_TYPES.CREATED,
    });
    assert.equal(canApplyUpdate(model), true);
    assert.equal(canApplyCancel(model), true);
  });
});
