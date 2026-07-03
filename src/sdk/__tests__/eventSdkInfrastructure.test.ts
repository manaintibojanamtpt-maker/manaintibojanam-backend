import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createEventInfrastructure,
  createEventStore,
  createSchemaRegistry,
  createOutboxRepository,
  createReplayService,
  createEventPublisher,
  createEventSubscriber,
} from '../events/adapters/EventInfrastructureFactory';
import { DefaultEventStore } from '../events/adapters/DefaultEventStore';
import { DefaultOutboxRepository } from '../events/adapters/DefaultOutboxRepository';
import { DefaultSchemaRegistry } from '../events/adapters/DefaultSchemaRegistry';
import { DefaultReplayService } from '../events/adapters/DefaultReplayService';
import { DefaultEventSubscriber } from '../events/adapters/DefaultEventSubscriber';
import { DefaultEventPublisher } from '../events/adapters/DefaultEventPublisher';
import {
  asAggregateId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
  asSchemaVersion,
} from '../events/types/branded';
import type { EventEnvelope } from '../events/dto/EventEnvelope';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import { createDefaultClock } from '../events/providers/DefaultClock';
import { createDefaultUuid } from '../events/providers/DefaultUuid';
import { createInMemoryIdempotencyRepository } from '../events/idempotency/InMemoryIdempotencyRepository';
import { createInMemoryDeadLetterRepository } from '../events/deadletter/InMemoryDeadLetterRepository';
import type { EventInfrastructureTelemetryEvent } from '../events/telemetry/EventInfrastructureTelemetry';
import { validateSchemaCompatibility } from '../events/validation/validateSchemaCompatibility';
import { enrichEventEnvelope } from '../events/validation/enrichEventEnvelope';
import { asIdempotencyKey } from '../events/dto/IdempotencyKey';
import { EVENT_SDK_VERSION } from '../events/version';

const ALL_FLAGS_ON: EventFeatureFlagReader = () => true;
const FLAGS_PLATFORM_ONLY: EventFeatureFlagReader = (f) => f === 'FF_EVENT_PLATFORM_ENABLED';

const partialEnvelope = (): Omit<EventEnvelope<{ test: boolean }>, 'header' | 'metadata'> & {
  header: Omit<EventEnvelope['header'], 'eventId' | 'occurredAt'>;
  metadata: Omit<EventEnvelope['metadata'], 'correlationId'>;
} => ({
  header: {
    type: asEventTypeName('infra.test'),
    version: '1.0.0',
    aggregateType: 'TestAggregate',
    aggregateId: asAggregateId('agg-001'),
  },
  metadata: {},
  payload: { test: true },
});

const fullEnvelope = (): EventEnvelope<{ test: boolean }> => ({
  header: {
    eventId: asEventId('evt-infra-001'),
    type: asEventTypeName('infra.test'),
    version: '1.0.0',
    aggregateType: 'TestAggregate',
    aggregateId: asAggregateId('agg-001'),
    occurredAt: '2026-06-26T12:00:00.000Z',
  },
  metadata: {
    correlationId: asCorrelationId('corr-infra-001'),
    idempotencyKey: 'idem-infra-001',
  },
  payload: { test: true },
});

describe('EventSDK infrastructure (M6 PR-2)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('createEventInfrastructure returns stub components when flags off', () => {
    const infra = createEventInfrastructure();
    assert.ok(infra.publisher);
    assert.ok(infra.subscriber);
    assert.ok(infra.replayService);
  });

  it('createEventStore supports readByAggregate and readByType', async () => {
    const store = createEventStore();
    const envelope = fullEnvelope();
    await store.append(envelope);

    const byAgg = await store.readByAggregate('TestAggregate', asAggregateId('agg-001'), 10);
    assert.equal(byAgg.ok, true);
    if (byAgg.ok) assert.equal(byAgg.value.length, 1);

    const byType = await store.readByType(asEventTypeName('infra.test'), 10);
    assert.equal(byType.ok, true);
    if (byType.ok) assert.equal(byType.value.length, 1);
  });

  it('DefaultOutboxRepository listPending returns pending records', async () => {
    const clock = createDefaultClock();
    const uuid = createDefaultUuid();
    const repo = new DefaultOutboxRepository(uuid, clock);
    const envelope = fullEnvelope();

    await repo.append({
      eventId: envelope.header.eventId,
      type: envelope.header.type,
      version: envelope.header.version,
      envelope,
      status: 'pending',
      attemptCount: 0,
    });

    const pending = await repo.listPending(10);
    assert.equal(pending.ok, true);
    if (pending.ok) assert.equal(pending.value.length, 1);
  });

  it('DefaultSchemaRegistry validateCompatibility passes for matching schema', async () => {
    const registry = new DefaultSchemaRegistry(createDefaultClock());
    await registry.register({
      type: asEventTypeName('infra.test'),
      version: '1.0.0',
      schemaVersion: asSchemaVersion('1.0.0'),
    });

    const result = await registry.validateCompatibility(
      asEventTypeName('infra.test'),
      '1.0.0',
      asSchemaVersion('1.0.0')
    );
    assert.equal(result.ok, true);
  });

  it('validateSchemaCompatibility fails when schema not found', () => {
    const result = validateSchemaCompatibility(null, asSchemaVersion('1.0.0'));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'SCHEMA_NOT_FOUND');
  });

  it('enrichEventEnvelope assigns missing eventId and correlationId', () => {
    const clock = createDefaultClock();
    const uuid = createDefaultUuid();
    const enriched = enrichEventEnvelope(
      {
        header: {
          type: 'infra.test',
          version: '1.0.0',
          aggregateType: 'TestAggregate',
          aggregateId: 'agg-001',
        },
        payload: { test: true },
      },
      { clock, uuid }
    );
    assert.ok(enriched.header.eventId);
    assert.ok(enriched.metadata.correlationId);
    assert.ok(enriched.header.occurredAt);
  });

  it('createEventPublisher emits telemetry on publish', async () => {
    const events: EventInfrastructureTelemetryEvent[] = [];
    const clock = createDefaultClock();
    const uuid = createDefaultUuid();
    const eventStore = new DefaultEventStore();
    const outbox = new DefaultOutboxRepository(uuid, clock, (e) => events.push(e));
    const schemaRegistry = new DefaultSchemaRegistry(clock);
    const idempotency = createInMemoryIdempotencyRepository();

    const publisher = createEventPublisher({
      featureFlags: ALL_FLAGS_ON,
      outboxRepository: outbox,
      eventStore,
      schemaRegistry,
      idempotencyRepository: idempotency,
      clock,
      uuid,
      onTelemetry: (e) => events.push(e),
    });

    const result = await publisher.publish(fullEnvelope());
    assert.equal(result.ok, true);
    assert.ok(events.some((e) => e.type === 'publish_started'));
    assert.ok(events.some((e) => e.type === 'publish_completed'));
    assert.ok(events.some((e) => e.type === 'outbox_append'));
  });

  it('createReplayService replayByAggregate filters by aggregate', async () => {
    const clock = createDefaultClock();
    const store = new DefaultEventStore();
    await store.append(fullEnvelope());

    const replay = new DefaultReplayService(store, clock, ALL_FLAGS_ON);
    const result = await replay.replayByAggregate({
      consumerGroup: 'test-group',
      aggregateType: 'TestAggregate',
      aggregateId: asAggregateId('agg-001'),
      dryRun: true,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.dryRun, true);
  });

  it('createReplayService replayByType filters by event type', async () => {
    const clock = createDefaultClock();
    const store = new DefaultEventStore();
    await store.append(fullEnvelope());

    const replay = new DefaultReplayService(store, clock, ALL_FLAGS_ON);
    const result = await replay.replayByType({
      consumerGroup: 'test-group',
      eventTypes: [asEventTypeName('infra.test')],
      dryRun: false,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.eventsReplayed, 1);
  });

  it('createReplayService replayRange respects dryRun', async () => {
    const clock = createDefaultClock();
    const store = new DefaultEventStore();
    await store.append(fullEnvelope());

    const replay = createReplayService({
      featureFlags: ALL_FLAGS_ON,
      eventStore: store,
      clock,
    });

    const result = await replay.replayRange({
      consumerGroup: 'test-group',
      dryRun: true,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.eventsReplayed, 0);
  });

  it('replay returns REPLAY_DISABLED when replay flag off', async () => {
    const replay = createReplayService({
      featureFlags: FLAGS_PLATFORM_ONLY,
      eventStore: new DefaultEventStore(),
      clock: createDefaultClock(),
    });
    const result = await replay.replay({ consumerGroup: 'g' });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'REPLAY_DISABLED');
  });

  it('DefaultEventSubscriber dead-letters on handler failure after max retries', async () => {
    const clock = createDefaultClock();
    const uuid = createDefaultUuid();
    const dlq = createInMemoryDeadLetterRepository();
    const subscriber = new DefaultEventSubscriber(uuid, clock, dlq);

    await subscriber.subscribe(
      {
        consumerGroup: 'dlq-test',
        eventTypes: [asEventTypeName('infra.test')],
        status: 'active',
        dlqEnabled: true,
      },
      async () => ({ ok: false, error: { code: 'INTERNAL', message: 'fail' } })
    );

    const sub = subscriber as DefaultEventSubscriber;
    for (let i = 0; i < 5; i++) {
      await sub.dispatch(fullEnvelope());
    }

    const listed = await dlq.list('dlq-test', 10);
    assert.equal(listed.ok, true);
    if (listed.ok) assert.equal(listed.value.length, 1);
  });

  it('InMemoryIdempotencyRepository detects duplicates with TTL', async () => {
    const repo = createInMemoryIdempotencyRepository();
    const key = asIdempotencyKey('dup-key');
    await repo.put({
      key,
      eventId: asEventId('evt-dup'),
      recordedAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2020-01-02T00:00:00.000Z',
    });

    const has = await repo.has(key);
    assert.equal(has.ok, true);
    if (has.ok) assert.equal(has.value, false);

    const purged = await repo.purgeExpired('2026-06-26T00:00:00.000Z');
    assert.equal(purged.ok, true);
  });

  it('createOutboxRepository returns stub when flags off', async () => {
    const repo = createOutboxRepository();
    const result = await repo.listPending(10);
    assert.equal(result.ok, false);
  });

  it('createEventInfrastructure wires all components when flags on', async () => {
    const infra = createEventInfrastructure({ featureFlags: ALL_FLAGS_ON });
    assert.ok(infra.publisher);
    assert.ok(infra.subscriber);
    assert.ok(infra.outboxRepository);
    assert.ok(infra.eventStore);
    assert.ok(infra.schemaRegistry);
    assert.ok(infra.replayService);
    assert.ok(infra.idempotencyRepository);
    assert.ok(infra.deadLetterRepository);
  });

  it('createSchemaRegistry registers and resolves schemas', async () => {
    const registry = createSchemaRegistry();
    await registry.register({
      type: asEventTypeName('infra.test'),
      version: '1.0.0',
      schemaVersion: asSchemaVersion('1.0.0'),
    });
    const resolved = await registry.resolve(asEventTypeName('infra.test'), '1.0.0');
    assert.equal(resolved.ok, true);
    if (resolved.ok) assert.ok(resolved.value);
  });

  it('createEventSubscriber registers subscription when platform enabled', async () => {
    const subscriber = createEventSubscriber({
      featureFlags: ALL_FLAGS_ON,
      uuid: createDefaultUuid(),
      clock: createDefaultClock(),
    });
    const result = await subscriber.subscribe(
      {
        consumerGroup: 'sub-test',
        eventTypes: [asEventTypeName('infra.test')],
        status: 'active',
        dlqEnabled: false,
      },
      async () => ({ ok: true, value: undefined })
    );
    assert.equal(result.ok, true);
  });
});
