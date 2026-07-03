import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderProjectionWorkerBundle } from '../events/projections/order/createOrderProjectionWorker';
import { createOrderEventFactory } from '../events/business/orders/OrderEventFactory';
import { createProjectionInfrastructure } from '../events/projection/ProjectionInfrastructureFactory';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { OrderProjectionTelemetryEvent } from '../events/projections/order/OrderProjectionTelemetry';
import { ORDER_EVENT_TYPES } from '../../domain/events/orders/OrderEventSchema';
import { ORDER_READ_PROJECTION_CONSUMER_GROUP } from '../../domain/events/projections/order/OrderProjectionMetadata';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';
import { asEventTypeName } from '../events/types/branded';

const ALL_ORDER_PROJECTION_FLAGS: EventFeatureFlagReader = () => true;
const ORDER_PROJECTION_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_RUNTIME_ENABLED' ||
  flag === 'FF_ORDER_READ_PROJECTION_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-26T20:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `order-proj-${++n}`;
  })(),
};

const legacyOrder = () => ({
  id: 'order-proj-001',
  tenantId: 'tenant-proj-001',
  userId: 'user-proj-001',
  status: 'PLACED',
  totalAmount: 750,
  subtotal: 700,
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [{ menuItemId: 'item-1', name: 'Thali', quantity: 1, lineTotal: 700 }],
  createdAt: '2026-06-26T20:00:00.000Z',
});

const publishContext = () => ({
  correlationId: 'corr-order-proj-001',
  idempotencyKey: 'idem-order-proj-001',
});

describe('EventSDK order read projection (M6 PR-7)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_ORDER_READ_PROJECTION_ENABLED to off', () => {
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_READ_PROJECTION_ENABLED, false);
  });

  it('OrderProjectionWorker skips when flags off', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const result = await bundle.worker.process(created.value);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('processes order.created.v1 and persists read model', async () => {
    const telemetry: OrderProjectionTelemetryEvent[] = [];
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const result = await bundle.worker.process(created.value);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.applied, true);
      assert.equal(result.value.eventType, ORDER_EVENT_TYPES.CREATED);
      assert.ok(result.value.readModel);
      assert.equal(result.value.readModel!.orderId, 'order-proj-001');
      assert.equal(result.value.readModel!.tenantId, 'tenant-proj-001');
      assert.equal(result.value.readModel!.customerId, 'user-proj-001');
      assert.equal(result.value.readModel!.currency, 'INR');
      assert.equal(result.value.readModel!.projectionVersion, '1.0.0');
    }

    const stored = await bundle.repository.get('order-proj-001');
    assert.equal(stored.ok, true);
    if (stored.ok) {
      assert.ok(stored.value);
      assert.equal(stored.value!.status, 'PLACED');
      assert.equal(stored.value!.totalAmount, 750);
    }

    const snapshot = await bundle.snapshotStore.loadLatest('order-proj-001');
    assert.equal(snapshot.ok, true);
    if (snapshot.ok) assert.ok(snapshot.value);

    assert.ok(telemetry.some((e) => e.type === 'order_projection_started'));
    assert.ok(telemetry.some((e) => e.type === 'order_projection_event_processed'));
    assert.ok(telemetry.some((e) => e.type === 'order_projection_completed'));
    assert.ok(telemetry.some((e) => e.type === 'order_projection_snapshot_saved'));
  });

  it('processes order.updated.v1 after create', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await bundle.worker.process(created.value);

    const updated = factory.createOrderUpdatedEvent(
      { ...legacyOrder(), status: 'CONFIRMED', totalAmount: 800 },
      publishContext(),
      { previousStatus: 'PLACED', updatedFields: ['status', 'totalAmount'] }
    );
    assert.equal(updated.ok, true);
    if (!updated.ok) return;

    const result = await bundle.worker.process(updated.value);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.applied, true);
      assert.equal(result.value.readModel!.status, 'CONFIRMED');
      assert.equal(result.value.readModel!.totalAmount, 800);
    }
  });

  it('processes order.cancelled.v1 after create', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await bundle.worker.process(created.value);

    const cancelled = factory.createOrderCancelledEvent(
      { ...legacyOrder(), status: 'CANCELLED' },
      publishContext(),
      'customer_request'
    );
    assert.equal(cancelled.ok, true);
    if (!cancelled.ok) return;

    const result = await bundle.worker.process(cancelled.value);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.applied, true);
      assert.equal(result.value.readModel!.status, 'CANCELLED');
    }
  });

  it('skips update when read model does not exist', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const updated = factory.createOrderUpdatedEvent(legacyOrder(), publishContext());
    assert.equal(updated.ok, true);
    if (!updated.ok) return;

    const result = await bundle.worker.process(updated.value);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.applied, false);
      assert.match(result.value.reason ?? '', /without existing read model/);
    }
  });

  it('rejects unsupported event type via envelope validation', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const badEnvelope = {
      ...created.value,
      header: { ...created.value.header, type: asEventTypeName('menu.item.created.v1') },
    };
    const result = await bundle.worker.process(badEnvelope);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION_FAILED');
  });

  it('requires all four flags including FF_ORDER_READ_PROJECTION_ENABLED', async () => {
    const threeFlagsOnly: EventFeatureFlagReader = (flag) =>
      flag !== 'FF_ORDER_READ_PROJECTION_ENABLED' && ORDER_PROJECTION_FLAGS(flag);

    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: threeFlagsOnly,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const result = await bundle.worker.process(created.value);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('repository listByTenant and count', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await bundle.worker.process(created.value);

    const listed = await bundle.repository.listByTenant('tenant-proj-001', 10);
    assert.equal(listed.ok, true);
    if (listed.ok) assert.equal(listed.value.length, 1);

    const count = await bundle.repository.count();
    assert.equal(count.ok, true);
    if (count.ok) assert.equal(count.value, 1);
  });

  it('asHandler integrates with projection infrastructure dispatcher', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const infra = createProjectionInfrastructure({
      featureFlags: ORDER_PROJECTION_FLAGS,
      projectionName: 'order-read-shadow',
      consumerGroup: ORDER_READ_PROJECTION_CONSUMER_GROUP,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      registrations: [bundle.registration],
    });

    const result = await infra.worker.process(created.value);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.processed, true);

    const stored = await bundle.repository.get('order-proj-001');
    assert.equal(stored.ok, true);
    if (stored.ok) assert.ok(stored.value);
  });

  it('read model contains no PII fields', async () => {
    const bundle = createOrderProjectionWorkerBundle({
      featureFlags: ALL_ORDER_PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const result = await bundle.worker.process(created.value);
    assert.equal(result.ok, true);
    if (result.ok && result.value.readModel) {
      const model = result.value.readModel as unknown as Record<string, unknown>;
      assert.equal('phone' in model, false);
      assert.equal('email' in model, false);
      assert.equal('customerName' in model, false);
      assert.equal('address' in model, false);
    }
  });
});
