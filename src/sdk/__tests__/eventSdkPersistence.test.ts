import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createFirestoreOutboxPersistence,
  createFirestoreEventStore,
  createFirestoreDeadLetterStore,
  createFirestoreIdempotencyStore,
  createShadowPublisherFactory,
  createFirestorePersistenceBundle,
} from '../events/persistence/FirestorePersistenceFactory';
import { createMockFirestorePersistence } from '../events/persistence/MockFirestorePersistence';
import { createFirestoreEventStoreAdapter } from '../events/persistence/FirestoreEventStoreAdapter';
import {
  DEFAULT_EVENT_OUTBOX_COLLECTION,
  DEFAULT_EVENT_STORE_COLLECTION,
  DEFAULT_EVENT_DEAD_LETTERS_COLLECTION,
  DEFAULT_EVENT_IDEMPOTENCY_COLLECTION,
} from '../events/persistence/collectionNames';
import {
  asAggregateId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
} from '../events/types/branded';
import type { EventEnvelope } from '../events/dto/EventEnvelope';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { EventPersistenceTelemetryEvent } from '../events/persistence/PersistenceTelemetry';

const ALL_PERSISTENCE_FLAGS: EventFeatureFlagReader = () => true;
const SHADOW_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_OUTBOX_ENABLED' ||
  flag === 'FF_EVENT_SHADOW_PUBLISHING_ENABLED';

const FIXED_CLOCK = {
  now: () => '2026-06-26T14:00:00.000Z',
};

const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `uuid-${++n}`;
  })(),
};

const sampleEnvelope = (): EventEnvelope<{ probe: string }> => ({
  header: {
    eventId: asEventId('evt-persist-001'),
    type: asEventTypeName('infra.persistence.probe'),
    version: '1.0.0',
    aggregateType: 'PersistenceProbe',
    aggregateId: asAggregateId('probe-001'),
    occurredAt: '2026-06-26T14:00:00.000Z',
  },
  metadata: {
    correlationId: asCorrelationId('corr-persist-001'),
    causationId: asCorrelationId('cause-persist-001'),
    idempotencyKey: 'idem-persist-001',
  },
  payload: { probe: 'shadow-only' },
});

describe('EventSDK persistence (M6 PR-3)', () => {
  it('uses default collection names', () => {
    assert.equal(DEFAULT_EVENT_OUTBOX_COLLECTION, 'event_outbox');
    assert.equal(DEFAULT_EVENT_STORE_COLLECTION, 'event_store');
    assert.equal(DEFAULT_EVENT_DEAD_LETTERS_COLLECTION, 'event_dead_letters');
    assert.equal(DEFAULT_EVENT_IDEMPOTENCY_COLLECTION, 'event_idempotency');
  });

  it('createFirestoreOutboxPersistence returns stub when flags off', async () => {
    const repo = createFirestoreOutboxPersistence({
      persistence: createMockFirestorePersistence(),
    });
    const result = await repo.append({
      eventId: asEventId('evt-x'),
      type: asEventTypeName('test'),
      version: '1.0.0',
      envelope: sampleEnvelope(),
      status: 'pending',
      attemptCount: 0,
    });
    assert.equal(result.ok, false);
  });

  it('FirestoreOutboxPersistenceAdapter append and listPending', async () => {
    const mock = createMockFirestorePersistence();
    const telemetry: EventPersistenceTelemetryEvent[] = [];
    const repo = createFirestoreOutboxPersistence({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const envelope = sampleEnvelope();
    const append = await repo.append({
      eventId: envelope.header.eventId,
      type: envelope.header.type,
      version: envelope.header.version,
      envelope,
      status: 'pending',
      attemptCount: 0,
    });
    assert.equal(append.ok, true);
    if (append.ok) {
      assert.equal(append.value.status, 'pending');
      assert.ok(append.value.outboxId);
    }

    const pending = await repo.fetchPending(10);
    assert.equal(pending.ok, true);
    if (pending.ok) assert.equal(pending.value.length, 1);

    assert.ok(telemetry.some((e) => e.type === 'outbox_written'));
  });

  it('FirestoreOutboxPersistenceAdapter markPublished updates document', async () => {
    const mock = createMockFirestorePersistence();
    const repo = createFirestoreOutboxPersistence({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const envelope = sampleEnvelope();
    const append = await repo.append({
      eventId: envelope.header.eventId,
      type: envelope.header.type,
      version: envelope.header.version,
      envelope,
      status: 'pending',
      attemptCount: 0,
    });
    assert.equal(append.ok, true);
    if (!append.ok) return;

    const published = await repo.markPublished(append.value.outboxId, FIXED_CLOCK.now());
    assert.equal(published.ok, true);

    const pending = await repo.fetchPending(10);
    assert.equal(pending.ok, true);
    if (pending.ok) assert.equal(pending.value.length, 0);
  });

  it('FirestoreEventStoreAdapter append and read', async () => {
    const mock = createMockFirestorePersistence();
    const store = createFirestoreEventStore({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
    });

    const envelope = sampleEnvelope();
    const append = await store.append(envelope);
    assert.equal(append.ok, true);

    const read = await store.read({ consumerGroup: 'test' }, 10);
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.value.length, 1);
      assert.equal(read.value[0]!.header.eventId, 'evt-persist-001');
    }
  });

  it('FirestoreEventStoreAdapter readByAggregate and readByType', async () => {
    const mock = createMockFirestorePersistence();
    const store = createFirestoreEventStoreAdapter({
      persistence: mock,
      clock: FIXED_CLOCK,
    });

    const envelope = sampleEnvelope();
    await store.append(envelope);

    const byAgg = await store.readByAggregate(
      'PersistenceProbe',
      asAggregateId('probe-001'),
      10
    );
    assert.equal(byAgg.ok, true);
    if (byAgg.ok) assert.equal(byAgg.value.length, 1);

    const byType = await store.readByType(asEventTypeName('infra.persistence.probe'), 10);
    assert.equal(byType.ok, true);
    if (byType.ok) assert.equal(byType.value.length, 1);
  });

  it('FirestoreIdempotencyAdapter detects duplicates with TTL', async () => {
    const mock = createMockFirestorePersistence();
    const store = createFirestoreIdempotencyStore({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      idempotencyTtlMs: 1000,
    });

    const first = await store.has('idem-key');
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.value, false);

    await store.mark('idem-key', 'evt-001');

    const second = await store.has('idem-key');
    assert.equal(second.ok, true);
    if (second.ok) assert.equal(second.value, true);
  });

  it('FirestoreDeadLetterAdapter records and lists failures', async () => {
    const mock = createMockFirestorePersistence();
    const dlq = createFirestoreDeadLetterStore({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const envelope = sampleEnvelope();
    const record = await dlq.record({
      eventId: envelope.header.eventId,
      type: envelope.header.type,
      envelope,
      consumerGroup: 'shadow-test',
      reason: 'persist_failed',
      attemptCount: 3,
    });
    assert.equal(record.ok, true);

    const listed = await dlq.list('shadow-test', 10);
    assert.equal(listed.ok, true);
    if (listed.ok) assert.equal(listed.value.length, 1);
  });

  it('ShadowPublisher writes to outbox only — no event store dispatch', async () => {
    const mock = createMockFirestorePersistence();
    const telemetry: EventPersistenceTelemetryEvent[] = [];
    const bundle = createFirestorePersistenceBundle({
      featureFlags: SHADOW_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const shadow = bundle.shadowPublisher;
    const envelope = sampleEnvelope();
    const result = await shadow.publish(envelope);
    assert.equal(result.ok, true);

    const pending = await bundle.outbox.fetchPending(10);
    assert.equal(pending.ok, true);
    if (pending.ok) assert.equal(pending.value.length, 1);

    const storeRead = await bundle.eventStore.read({ consumerGroup: 'shadow' }, 10);
    assert.equal(storeRead.ok, true);
    if (storeRead.ok) assert.equal(storeRead.value.length, 0);

    assert.ok(telemetry.some((e) => e.type === 'shadow_publish'));
    assert.ok(telemetry.some((e) => e.type === 'outbox_written'));
  });

  it('ShadowPublisher deduplicates by idempotency key', async () => {
    const mock = createMockFirestorePersistence();
    const shadow = createShadowPublisherFactory({
      featureFlags: SHADOW_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const envelope = sampleEnvelope();
    const first = await shadow.publish(envelope);
    const second = await shadow.publish(envelope);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (second.ok) assert.equal(second.value.duplicate, true);
  });

  it('ShadowPublisher returns NOT_CONFIGURED when shadow flag off', async () => {
    const mock = createMockFirestorePersistence();
    const noShadow: EventFeatureFlagReader = (flag) => flag !== 'FF_EVENT_SHADOW_PUBLISHING_ENABLED';
    const shadow = createShadowPublisherFactory({
      featureFlags: noShadow,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const result = await shadow.publish(sampleEnvelope());
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('persists complete envelope fields in outbox document', async () => {
    const mock = createMockFirestorePersistence();
    const repo = createFirestoreOutboxPersistence({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const envelope = sampleEnvelope();
    const append = await repo.append({
      eventId: envelope.header.eventId,
      type: envelope.header.type,
      version: envelope.header.version,
      envelope,
      status: 'pending',
      attemptCount: 0,
    });
    assert.equal(append.ok, true);
    if (!append.ok) return;

    const doc = await mock.get(DEFAULT_EVENT_OUTBOX_COLLECTION, append.value.outboxId);
    assert.ok(doc);
    assert.equal(doc!.data.eventId, 'evt-persist-001');
    assert.equal(doc!.data.aggregateId, 'probe-001');
    assert.equal(doc!.data.aggregateType, 'PersistenceProbe');
    assert.equal(doc!.data.eventType, 'infra.persistence.probe');
    assert.equal(doc!.data.eventVersion, '1.0.0');
    assert.equal(doc!.data.published, false);
    assert.ok(doc!.data.payload);
    assert.equal((doc!.data.metadata as Record<string, unknown>).correlationId, 'corr-persist-001');
    assert.equal((doc!.data.metadata as Record<string, unknown>).causationId, 'cause-persist-001');
  });

  it('supports configurable collection names', async () => {
    const mock = createMockFirestorePersistence();
    const customOutbox = 'custom_outbox';
    const localUuid = { generate: () => 'custom-outbox-id' };
    const repo = createFirestoreOutboxPersistence({
      featureFlags: ALL_PERSISTENCE_FLAGS,
      persistence: mock,
      clock: FIXED_CLOCK,
      uuid: localUuid,
      collections: { outbox: customOutbox },
    });

    const envelope = sampleEnvelope();
    const append = await repo.append({
      eventId: envelope.header.eventId,
      type: envelope.header.type,
      version: envelope.header.version,
      envelope,
      status: 'pending',
      attemptCount: 0,
    });
    assert.equal(append.ok, true);
    if (!append.ok) return;

    const doc = await mock.get(customOutbox, append.value.outboxId);
    assert.ok(doc);
  });
});
