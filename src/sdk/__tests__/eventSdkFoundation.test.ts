import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EVENT_SDK_FEATURE_FLAG_DEFAULTS,
  EVENT_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../events/core/featureFlags';
import {
  EVENT_PLATFORM_LAW,
  EVENT_PLATFORM_LAW_STATEMENTS,
} from '../events/core/platformLaw';
import {
  createEventSDK,
  resolveEventEnabled,
  createEventPublisher,
  createEventSubscriber,
  createOutboxRepository,
} from '../events/createEventSDK';
import { createStubEventAdapter } from '../events/adapters/StubEventAdapter';
import {
  EVENT_SDK_FROZEN,
  EVENT_SDK_MODULE,
  EVENT_SDK_VERSION,
} from '../events/version';
import {
  asAggregateId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
} from '../events/types/branded';
import { validateEventEnvelope } from '../events/validation/validateEventEnvelope';
import type { EventEnvelope } from '../events/dto/EventEnvelope';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import { createDefaultClock } from '../events/providers/DefaultClock';
import { createDefaultUuid } from '../events/providers/DefaultUuid';
import { createInMemoryEventStore } from '../events/providers/InMemoryEventStore';
import { createInMemoryOutboxRepository } from '../events/repository/InMemoryOutboxRepository';
import { createInMemoryIdempotencyStore } from '../events/providers/InMemoryIdempotencyStore';
import { createInMemorySchemaRegistry } from '../events/providers/InMemorySchemaRegistry';
import { asSchemaVersion } from '../events/types/branded';

const ALL_FLAGS_ON: EventFeatureFlagReader = () => true;

const sampleEnvelope = (): EventEnvelope<{ orderId: string }> => ({
  header: {
    eventId: asEventId('evt-001'),
    type: asEventTypeName('order.created'),
    version: '1.0.0',
    aggregateType: 'Order',
    aggregateId: asAggregateId('order-123'),
    occurredAt: '2026-06-26T10:00:00.000Z',
  },
  metadata: {
    correlationId: asCorrelationId('corr-001'),
    idempotencyKey: 'idem-001',
  },
  payload: { orderId: 'order-123' },
});

describe('EventSDK foundation (M6 PR-1)', () => {
  it('exports EVENT_SDK_VERSION as 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('exports EVENT_SDK_FROZEN as true', () => {
    assert.equal(EVENT_SDK_FROZEN, true);
  });

  it('exports EVENT_SDK_MODULE as events', () => {
    assert.equal(EVENT_SDK_MODULE, 'events');
  });

  it('defaults all event feature flags to off', () => {
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_PLATFORM_ENABLED, false);
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_OUTBOX_ENABLED, false);
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_REPLAY_ENABLED, false);
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_SHADOW_PUBLISHING_ENABLED, false);
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_PROJECTION_ENABLED, false);
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(
      EVENT_SDK_FEATURE_FLAG_ENV_KEYS.FF_EVENT_PLATFORM_ENABLED,
      'VITE_FF_EVENT_PLATFORM_ENABLED'
    );
    assert.equal(
      EVENT_SDK_FEATURE_FLAG_ENV_KEYS.FF_EVENT_OUTBOX_ENABLED,
      'VITE_FF_EVENT_OUTBOX_ENABLED'
    );
    assert.equal(
      EVENT_SDK_FEATURE_FLAG_ENV_KEYS.FF_EVENT_REPLAY_ENABLED,
      'VITE_FF_EVENT_REPLAY_ENABLED'
    );
    assert.equal(
      EVENT_SDK_FEATURE_FLAG_ENV_KEYS.FF_EVENT_SHADOW_PUBLISHING_ENABLED,
      'VITE_FF_EVENT_SHADOW_PUBLISHING_ENABLED'
    );
  });

  it('exports platform law statements', () => {
    assert.equal(EVENT_PLATFORM_LAW, 'event-platform-law-v1');
    assert.ok(EVENT_PLATFORM_LAW_STATEMENTS.length >= 4);
    assert.ok(
      EVENT_PLATFORM_LAW_STATEMENTS.some((s) => s.includes('EventEnvelope'))
    );
  });

  it('resolveEventEnabled returns false by default', () => {
    assert.equal(resolveEventEnabled(), false);
  });

  it('createEventSDK returns stub when flags off', async () => {
    const sdk = createEventSDK();
    const result = await sdk.publish(sampleEnvelope());
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_CONFIGURED');
    }
  });

  it('stub adapter returns NOT_CONFIGURED for all methods', async () => {
    const sdk = createStubEventAdapter();
    const publish = await sdk.publish(sampleEnvelope());
    assert.equal(publish.ok, false);

    const subscribe = await sdk.subscribe(
      { consumerGroup: 'test', eventTypes: [asEventTypeName('order.created')], status: 'active', dlqEnabled: true },
      async () => ({ ok: true, value: undefined })
    );
    assert.equal(subscribe.ok, false);

    const schema = await sdk.registerSchema({
      type: asEventTypeName('order.created'),
      version: '1.0.0',
      schemaVersion: asSchemaVersion('1.0.0'),
    });
    assert.equal(schema.ok, false);

    const replay = await sdk.replay({ consumerGroup: 'test' });
    assert.equal(replay.ok, false);
  });

  it('validateEventEnvelope accepts valid envelope', () => {
    const result = validateEventEnvelope(sampleEnvelope());
    assert.equal(result.ok, true);
  });

  it('validateEventEnvelope rejects missing correlationId', () => {
    const envelope = sampleEnvelope();
    const invalid = {
      ...envelope,
      metadata: { ...envelope.metadata, correlationId: '' as ReturnType<typeof asCorrelationId> },
    };
    const result = validateEventEnvelope(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'ENVELOPE_INVALID');
    }
  });

  it('createEventPublisher publishes when all flags on and ports provided', async () => {
    const clock = createDefaultClock();
    const uuid = createDefaultUuid();
    const publisher = createEventPublisher({
      featureFlags: ALL_FLAGS_ON,
      outboxRepository: createInMemoryOutboxRepository(uuid),
      eventStore: createInMemoryEventStore(),
      idempotencyStore: createInMemoryIdempotencyStore(),
      clock,
    });

    const result = await publisher.publish(sampleEnvelope());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.eventId, 'evt-001');
      assert.equal(result.value.duplicate, undefined);
    }
  });

  it('createEventPublisher deduplicates by idempotencyKey', async () => {
    const clock = createDefaultClock();
    const uuid = createDefaultUuid();
    const publisher = createEventPublisher({
      featureFlags: ALL_FLAGS_ON,
      outboxRepository: createInMemoryOutboxRepository(uuid),
      eventStore: createInMemoryEventStore(),
      idempotencyStore: createInMemoryIdempotencyStore(),
      clock,
    });

    const envelope = sampleEnvelope();
    const first = await publisher.publish(envelope);
    const second = await publisher.publish(envelope);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.value.duplicate, true);
    }
  });

  it('createEventSubscriber registers when platform enabled', async () => {
    const uuid = createDefaultUuid();
    const subscriber = createEventSubscriber({
      featureFlags: ALL_FLAGS_ON,
      uuid,
    });

    const result = await subscriber.subscribe(
      {
        consumerGroup: 'projection-orders',
        eventTypes: [asEventTypeName('order.created')],
        status: 'active',
        dlqEnabled: true,
      },
      async () => ({ ok: true, value: undefined })
    );
    assert.equal(result.ok, true);
  });

  it('createOutboxRepository returns stub when flags off', async () => {
    const repo = createOutboxRepository();
    const result = await repo.listPending(10);
    assert.equal(result.ok, false);
  });

  it('createEventSDK with flags on publishes via default adapter', async () => {
    const sdk = createEventSDK({ featureFlags: ALL_FLAGS_ON });
    const schema = await sdk.registerSchema({
      type: asEventTypeName('order.created'),
      version: '1.0.0',
      schemaVersion: asSchemaVersion('1.0.0'),
    });
    assert.equal(schema.ok, true);

    const publish = await sdk.publish(sampleEnvelope());
    assert.equal(publish.ok, true);
  });

  it('replay returns REPLAY_DISABLED when replay flag off', async () => {
    const sdk = createEventSDK({
      featureFlags: (flag) => flag === 'FF_EVENT_PLATFORM_ENABLED',
    });
    const result = await sdk.replay({ consumerGroup: 'test', dryRun: true });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'REPLAY_DISABLED');
    }
  });

  it('replay succeeds when replay flag on', async () => {
    const sdk = createEventSDK({ featureFlags: ALL_FLAGS_ON });
    await sdk.publish(sampleEnvelope());
    const result = await sdk.replay({ consumerGroup: 'test', dryRun: true });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.dryRun, true);
      assert.equal(result.value.eventsReplayed, 0);
    }
  });

  it('in-memory schema registry resolves registered schema', async () => {
    const registry = createInMemorySchemaRegistry();
    await registry.register({
      type: asEventTypeName('order.created'),
      version: '1.0.0',
      schemaVersion: asSchemaVersion('1.0.0'),
    });
    const resolved = await registry.resolve(asEventTypeName('order.created'), '1.0.0');
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.ok(resolved.value);
      assert.equal(resolved.value!.type, 'order.created');
    }
  });
});
