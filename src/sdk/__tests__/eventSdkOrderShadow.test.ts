import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderShadowPublisherFactory } from '../events/business/orders/createOrderShadowPublisher';
import { createDefaultOutboxRepository } from '../events/adapters/DefaultOutboxRepository';
import { createOrderEventMapper } from '../events/business/orders/OrderEventMapper';
import { createOrderEventValidator } from '../events/business/orders/OrderEventValidator';
import { createOrderEventFactory } from '../events/business/orders/OrderEventFactory';
import type { EventPublisherPort } from '../events/contracts/ports';
import type { PublishResult } from '../events/dto/PublishResult';
import type { SdkAsyncResult } from '../core/result';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { OrderEventTelemetryEvent } from '../events/business/orders/OrderEventTelemetry';
import { ORDER_EVENT_TYPES } from '../../domain/events/orders/OrderEventSchema';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';
import { asEventTypeName } from '../events/types/branded';

const ALL_ORDER_SHADOW_FLAGS: EventFeatureFlagReader = () => true;
const ORDER_SHADOW_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_OUTBOX_ENABLED' ||
  flag === 'FF_EVENT_SHADOW_PUBLISHING_ENABLED' ||
  flag === 'FF_ORDER_SHADOW_EVENTS_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-26T18:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `order-evt-${++n}`;
  })(),
};

const legacyOrder = () => ({
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

const publishContext = () => ({
  correlationId: 'corr-order-001',
  idempotencyKey: 'idem-order-001',
});

describe('EventSDK order shadow publishing (M6 PR-5)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_ORDER_SHADOW_EVENTS_ENABLED to off', () => {
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_SHADOW_EVENTS_ENABLED, false);
  });

  it('OrderEventMapper maps order.created.v1 envelope', () => {
    const mapper = createOrderEventMapper({
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const result = mapper.mapCreated(legacyOrder(), publishContext());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.header.type, ORDER_EVENT_TYPES.CREATED);
      assert.equal(result.value.header.version, '1.0.0');
      assert.equal(result.value.header.aggregateId, 'order-001');
      assert.equal(result.value.metadata.correlationId, 'corr-order-001');
    }
  });

  it('OrderEventValidator rejects unsupported event type', () => {
    const validator = createOrderEventValidator();
    const mapped = createOrderEventMapper({ clock: FIXED_CLOCK, uuid: FIXED_UUID }).mapCreated(
      legacyOrder(),
      publishContext()
    );
    assert.equal(mapped.ok, true);
    if (mapped.ok) {
      const badEnvelope = {
        ...mapped.value,
        header: { ...mapped.value.header, type: asEventTypeName('menu.item.created.v1') },
      };
      const validated = validator.validateEnvelope(badEnvelope);
      assert.equal(validated.ok, false);
    }
  });

  it('OrderEventFactory creates validated order.updated.v1 envelope', () => {
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const result = factory.createOrderUpdatedEvent(legacyOrder(), publishContext(), {
      previousStatus: 'PENDING',
      updatedFields: ['status'],
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.header.type, ORDER_EVENT_TYPES.UPDATED);
  });

  it('OrderShadowPublisher skips when flags off', async () => {
    const outbox = createDefaultOutboxRepository({ uuid: FIXED_UUID, clock: FIXED_CLOCK });
    const publisher = createOrderShadowPublisherFactory({ outboxRepository: outbox });
    const result = await publisher.publishOrderCreated(legacyOrder(), publishContext());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.published, false);
      assert.equal(result.value.skipped, true);
    }
    const pending = await outbox.fetchPending(10);
    assert.equal(pending.ok, true);
    if (pending.ok) assert.equal(pending.value.length, 0);
  });

  it('OrderShadowPublisher persists order.created.v1 to outbox only', async () => {
    const telemetry: OrderEventTelemetryEvent[] = [];
    const outbox = createDefaultOutboxRepository({ uuid: FIXED_UUID, clock: FIXED_CLOCK });
    const publisher = createOrderShadowPublisherFactory({
      featureFlags: ORDER_SHADOW_FLAGS,
      outboxRepository: outbox,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await publisher.publishOrderCreated(legacyOrder(), publishContext());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.published, true);
      assert.equal(result.value.eventType, ORDER_EVENT_TYPES.CREATED);
      assert.ok(result.value.eventId);
      assert.ok(result.value.outboxId);
    }

    const pending = await outbox.fetchPending(10);
    assert.equal(pending.ok, true);
    if (pending.ok) {
      assert.equal(pending.value.length, 1);
      assert.equal(pending.value[0]!.type, ORDER_EVENT_TYPES.CREATED);
      assert.equal(pending.value[0]!.status, 'pending');
    }

    assert.ok(telemetry.some((e) => e.type === 'order_event_mapped'));
    assert.ok(telemetry.some((e) => e.type === 'order_shadow_publish_completed'));
  });

  it('OrderShadowPublisher persists order.cancelled.v1', async () => {
    const outbox = createDefaultOutboxRepository({ uuid: FIXED_UUID, clock: FIXED_CLOCK });
    const publisher = createOrderShadowPublisherFactory({
      featureFlags: ORDER_SHADOW_FLAGS,
      outboxRepository: outbox,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await publisher.publishOrderCancelled(
      { ...legacyOrder(), status: 'CANCELLED' },
      publishContext(),
      'customer_request'
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.eventType, ORDER_EVENT_TYPES.CANCELLED);
  });

  it('publish failure does not throw and returns published false', async () => {
    const failingPublisher: EventPublisherPort = {
      publish: async (): SdkAsyncResult<PublishResult> => ({
        ok: false,
        error: { code: 'UNAVAILABLE', message: 'mock publish failed' },
      }),
    };

    const outbox = createDefaultOutboxRepository({ uuid: FIXED_UUID, clock: FIXED_CLOCK });
    const publisher = createOrderShadowPublisherFactory({
      featureFlags: ORDER_SHADOW_FLAGS,
      outboxRepository: outbox,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      publisher: failingPublisher,
    });

    const result = await publisher.publishOrderCreated(legacyOrder(), publishContext());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.published, false);
      assert.match(result.value.reason ?? '', /mock publish failed/);
    }
  });

  it('mapping failure does not throw and returns published false', async () => {
    const outbox = createDefaultOutboxRepository({ uuid: FIXED_UUID, clock: FIXED_CLOCK });
    const publisher = createOrderShadowPublisherFactory({
      featureFlags: ALL_ORDER_SHADOW_FLAGS,
      outboxRepository: outbox,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await publisher.publishOrderCreated(
      { ...legacyOrder(), id: '', tenantId: '' },
      publishContext()
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.published, false);
  });

  it('requires all four flags including FF_ORDER_SHADOW_EVENTS_ENABLED', async () => {
    const outbox = createDefaultOutboxRepository({ uuid: FIXED_UUID, clock: FIXED_CLOCK });
    const threeFlagsOnly: EventFeatureFlagReader = (flag) =>
      flag !== 'FF_ORDER_SHADOW_EVENTS_ENABLED' && ORDER_SHADOW_FLAGS(flag);

    const publisher = createOrderShadowPublisherFactory({
      featureFlags: threeFlagsOnly,
      outboxRepository: outbox,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await publisher.publishOrderCreated(legacyOrder(), publishContext());
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.skipped, true);
  });
});
