import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EVENT_DOMAIN_VERSION } from '../shared/EventConstants';
import { validateDomainEventInput, isValidDomainEventInput } from '../validation/validateDomainEvent';
import { buildOutboxRecord, shouldRetryOutbox, nextOutboxStatus } from '../outbox/OutboxRecordBuilder';
import { resolveOutboxBackoffMs, OUTBOX_MAX_RETRY_ATTEMPTS } from '../outbox/OutboxPolicy';
import { createEventTypeRegistry } from '../registry/EventTypeRegistry';
import { resolveEventSchemaVersion } from '../schema/EventVersionResolver';
import { validateSchemaShape, assertRequiredSchemaFields } from '../schema/EventSchemaValidator';
import { createPublishIntent } from '../publisher/EventPublisher';
import { matchesSubscription, validateSubscriptionFilter } from '../subscriber/EventSubscriptionHandler';
import { planReplay, filterEventsByType } from '../replay/ReplayEngine';
import { clampReplayBatchSize, REPLAY_MAX_BATCH_SIZE } from '../replay/ReplayPolicy';

const validEvent = () => ({
  header: {
    eventId: 'evt-001',
    type: 'order.created',
    version: '1.0.0',
    aggregateType: 'Order',
    aggregateId: 'order-123',
    occurredAt: '2026-06-26T10:00:00.000Z',
  },
  metadata: {
    correlationId: 'corr-001',
  },
  payload: { orderId: 'order-123' },
});

describe('Event domain (M6 PR-1)', () => {
  it('exports EVENT_DOMAIN_VERSION', () => {
    assert.equal(EVENT_DOMAIN_VERSION, '0.1.0-foundation');
  });

  it('validateDomainEventInput accepts valid input', () => {
    assert.equal(isValidDomainEventInput(validEvent()), true);
    assert.equal(validateDomainEventInput(validEvent()).length, 0);
  });

  it('validateDomainEventInput rejects invalid semver', () => {
    const input = validEvent();
    input.header.version = 'bad';
    assert.equal(isValidDomainEventInput(input), false);
  });

  it('buildOutboxRecord creates record from valid input', () => {
    const record = buildOutboxRecord({
      envelope: validEvent(),
      status: 'pending',
      attemptCount: 0,
    });
    assert.ok(record);
    assert.equal(record!.eventId, 'evt-001');
    assert.equal(record!.status, 'pending');
  });

  it('buildOutboxRecord returns null for invalid envelope', () => {
    const input = validEvent();
    input.metadata.correlationId = '';
    const record = buildOutboxRecord({
      envelope: input,
      status: 'pending',
      attemptCount: 0,
    });
    assert.equal(record, null);
  });

  it('shouldRetryOutbox respects max attempts', () => {
    assert.equal(shouldRetryOutbox(0, OUTBOX_MAX_RETRY_ATTEMPTS), true);
    assert.equal(shouldRetryOutbox(OUTBOX_MAX_RETRY_ATTEMPTS, OUTBOX_MAX_RETRY_ATTEMPTS), false);
  });

  it('nextOutboxStatus transitions correctly', () => {
    assert.equal(nextOutboxStatus('pending', true, 1, 5), 'published');
    assert.equal(nextOutboxStatus('pending', false, 5, 5), 'dead_letter');
    assert.equal(nextOutboxStatus('pending', false, 2, 5), 'failed');
  });

  it('resolveOutboxBackoffMs returns increasing delays', () => {
    assert.ok(resolveOutboxBackoffMs(0) <= resolveOutboxBackoffMs(3));
  });

  it('EventTypeRegistry registers and resolves schemas', () => {
    const registry = createEventTypeRegistry();
    registry.register(
      { type: 'order.created', version: '1.0.0', schemaVersion: '1.0.0' },
      '2026-06-26T10:00:00.000Z'
    );
    assert.equal(registry.size(), 1);
    const resolved = registry.resolve('order.created', '1.0.0');
    assert.ok(resolved);
  });

  it('resolveEventSchemaVersion finds exact match', () => {
    const registry = createEventTypeRegistry();
    const schema = registry.register(
      { type: 'order.created', version: '1.0.0', schemaVersion: '1.0.0' },
      '2026-06-26T10:00:00.000Z'
    );
    const result = resolveEventSchemaVersion([schema], 'order.created', '1.0.0');
    assert.equal(result.resolved, true);
  });

  it('resolveEventSchemaVersion returns NOT_FOUND for unknown type', () => {
    const result = resolveEventSchemaVersion([], 'unknown', '1.0.0');
    assert.equal(result.resolved, false);
    assert.equal(result.reason, 'NOT_FOUND');
  });

  it('validateSchemaShape accepts valid schema', () => {
    assert.equal(validateSchemaShape({ type: 'object' }), true);
    assert.equal(validateSchemaShape(undefined), true);
  });

  it('assertRequiredSchemaFields detects missing fields', () => {
    assert.deepEqual(assertRequiredSchemaFields('', '', ''), ['type', 'version', 'schemaVersion']);
    assert.deepEqual(assertRequiredSchemaFields('t', '1.0.0', '1.0.0'), []);
  });

  it('createPublishIntent builds intent from valid envelope', () => {
    const intent = createPublishIntent(validEvent());
    assert.ok(intent);
    assert.equal(intent!.useOutbox, true);
  });

  it('matchesSubscription filters by type and status', () => {
    assert.equal(
      matchesSubscription(
        { consumerGroup: 'g', eventTypes: ['order.created'], status: 'active' },
        'order.created'
      ),
      true
    );
    assert.equal(
      matchesSubscription(
        { consumerGroup: 'g', eventTypes: ['order.created'], status: 'paused' },
        'order.created'
      ),
      false
    );
  });

  it('validateSubscriptionFilter requires consumerGroup and eventTypes', () => {
    assert.ok(validateSubscriptionFilter({ consumerGroup: '', eventTypes: [], status: 'active' }).length > 0);
  });

  it('planReplay blocks when replay disabled', () => {
    const plan = planReplay({ consumerGroup: 'test' }, false);
    assert.equal(plan.allowed, false);
  });

  it('planReplay allows when replay enabled', () => {
    const plan = planReplay({ consumerGroup: 'test', dryRun: true }, true);
    assert.equal(plan.allowed, true);
    assert.equal(plan.dryRun, true);
  });

  it('filterEventsByType filters correctly', () => {
    const events = [
      { header: { type: 'order.created' } },
      { header: { type: 'order.updated' } },
    ];
    const filtered = filterEventsByType(events, ['order.created']);
    assert.equal(filtered.length, 1);
  });

  it('clampReplayBatchSize respects limits', () => {
    assert.equal(clampReplayBatchSize(0), 1);
    assert.equal(clampReplayBatchSize(9999), REPLAY_MAX_BATCH_SIZE);
  });
});
