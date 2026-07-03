import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createProjectionInfrastructure,
  createProjectionRegistry,
  createProjectionDispatcher,
} from '../events/projection/ProjectionInfrastructureFactory';
import { createProjectionCheckpointRepository } from '../events/projection/ProjectionCheckpointRepository';
import { createProjectionLeaseManager } from '../events/projection/ProjectionLeaseManager';
import { createInMemoryDeadLetterPort } from '../events/deadletter/InMemoryDeadLetterPort';
import {
  asAggregateId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
} from '../events/types/branded';
import type { EventEnvelope } from '../events/dto/EventEnvelope';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type {
  ProjectionHandlerPort,
  ProjectionHandlerRegistration,
} from '../events/contracts/projectionPorts';
import type { ProjectionIdentity } from '../../domain/events/projection/shared/ProjectionIdentityTypes';
import type { ProjectionTelemetryEvent } from '../events/projection/ProjectionTelemetry';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';

const PROJECTION_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' || flag === 'FF_EVENT_PROJECTION_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-26T16:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `proj-uuid-${++n}`;
  })(),
};

const testIdentity = (overrides: Partial<ProjectionIdentity> = {}): ProjectionIdentity => ({
  projectionName: 'test-proj',
  projectionVersion: '1.0.0',
  consumerGroup: 'test-group',
  ownerPlatform: 'M6',
  replaySupported: true,
  checkpointStrategy: 'event_id',
  ...overrides,
});

const testRegistration = (
  handler: ProjectionHandlerPort,
  overrides: Partial<ProjectionIdentity> = {}
): ProjectionHandlerRegistration => ({
  identity: testIdentity(overrides),
  eventTypes: [asEventTypeName('infra.projection.probe')],
  handlerVersion: '1.0.0',
  handler,
});

const infraProbeEnvelope = (): EventEnvelope<{ probe: string }> => ({
  header: {
    eventId: asEventId('evt-proj-001'),
    type: asEventTypeName('infra.projection.probe'),
    version: '1.0.0',
    aggregateType: 'ProjectionProbe',
    aggregateId: asAggregateId('probe-001'),
    occurredAt: '2026-06-26T16:00:00.000Z',
  },
  metadata: {
    correlationId: asCorrelationId('corr-proj-001'),
  },
  payload: { probe: 'worker-foundation' },
});

const noopHandler = (): ProjectionHandlerPort => ({
  handle: async () => ({ ok: true, value: undefined }),
});

const failingHandler = (): ProjectionHandlerPort => ({
  handle: async () => ({
    ok: false,
    error: { code: 'INTERNAL', message: 'handler failed' },
  }),
});

describe('EventSDK projection worker (M6 PR-4)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_EVENT_PROJECTION_ENABLED to off', () => {
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_PROJECTION_ENABLED, false);
  });

  it('createProjectionInfrastructure returns stub worker when flags off', async () => {
    const infra = createProjectionInfrastructure({
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
    });
    const result = await infra.worker.process(infraProbeEnvelope());
    assert.equal(result.ok, false);
  });

  it('ProjectionRegistry rejects duplicate ProjectionIdentity', async () => {
    const registry = createProjectionRegistry();
    const reg = testRegistration(noopHandler());

    const first = await registry.register(reg);
    assert.equal(first.ok, true);

    const duplicate = await registry.register(reg);
    assert.equal(duplicate.ok, false);
    if (!duplicate.ok) {
      assert.match(duplicate.error.message, /Duplicate ProjectionIdentity/);
    }
  });

  it('ProjectionRegistry validates identity on register', async () => {
    const registry = createProjectionRegistry();
    const invalid = await registry.register({
      identity: testIdentity({ projectionName: '' }),
      eventTypes: [asEventTypeName('infra.projection.probe')],
      handlerVersion: '1.0.0',
      handler: noopHandler(),
    });
    assert.equal(invalid.ok, false);
  });

  it('ProjectionRegistry registers and looks up handlers', async () => {
    const registry = createProjectionRegistry();
    await registry.register(testRegistration(noopHandler()));

    const lookup = await registry.lookup(asEventTypeName('infra.projection.probe'), 'test-group');
    assert.equal(lookup.ok, true);
    if (lookup.ok) assert.equal(lookup.value.length, 1);
  });

  it('ProjectionDispatcher invokes matching handler', async () => {
    let invoked = false;
    const registry = createProjectionRegistry();
    await registry.register({
      ...testRegistration({
        handle: async () => {
          invoked = true;
          return { ok: true, value: undefined };
        },
      }),
    });

    const dispatcher = createProjectionDispatcher({ registry });
    const result = await dispatcher.dispatch(infraProbeEnvelope(), 'test-group');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.matchedHandlers, 1);
      assert.equal(result.value.invokedHandlers, 1);
    }
    assert.equal(invoked, true);
  });

  it('ProjectionWorker processes envelope and saves checkpoint', async () => {
    const telemetry: ProjectionTelemetryEvent[] = [];
    const infra = createProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
      registrations: [testRegistration(noopHandler())],
    });

    const result = await infra.worker.process(infraProbeEnvelope());
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.processed, true);

    const checkpoint = await infra.checkpointRepository.load('test-proj', 'test-group');
    assert.equal(checkpoint.ok, true);
    if (checkpoint.ok) {
      assert.ok(checkpoint.value);
      assert.equal(checkpoint.value!.eventId, 'evt-proj-001');
      assert.equal(checkpoint.value!.sequence, 1);
      assert.equal(checkpoint.value!.projectionVersion, '1.0.0');
      assert.equal(checkpoint.value!.schemaVersion, '1.0.0');
    }

    assert.ok(telemetry.some((e) => e.type === 'projection_started'));
    assert.ok(telemetry.some((e) => e.type === 'checkpoint_saved'));
    assert.ok(telemetry.some((e) => e.type === 'handler_invoked'));
  });

  it('ProjectionWorker skips when no handler matches', async () => {
    const infra = createProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.worker.process(infraProbeEnvelope());
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.skipped, true);
  });

  it('ProjectionWorker retries and dead-letters on handler failure', async () => {
    const dlq = createInMemoryDeadLetterPort();
    const infra = createProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      deadLetterPort: dlq,
      registrations: [testRegistration(failingHandler())],
    });

    const envelope = infraProbeEnvelope();
    for (let i = 0; i < 5; i++) {
      await infra.worker.process(envelope);
    }

    const listed = await dlq.list('test-group', 10);
    assert.equal(listed.ok, true);
    if (listed.ok) assert.equal(listed.value.length, 1);
  });

  it('ProjectionLeaseManager acquire, renew, and release', async () => {
    const telemetry: ProjectionTelemetryEvent[] = [];
    const lease = createProjectionLeaseManager(FIXED_CLOCK, (e) => telemetry.push(e));

    const acquired = await lease.acquire('test-proj', 'holder-1', 30_000);
    assert.equal(acquired.ok, true);
    if (acquired.ok) assert.equal(acquired.value, true);

    const blocked = await lease.acquire('test-proj', 'holder-2', 30_000);
    assert.equal(blocked.ok, true);
    if (blocked.ok) assert.equal(blocked.value, false);

    const renewed = await lease.renew('test-proj', 'holder-1', 30_000);
    assert.equal(renewed.ok, true);
    if (renewed.ok) assert.equal(renewed.value, true);

    await lease.release('test-proj', 'holder-1');
    assert.ok(telemetry.some((e) => e.type === 'lease_acquired'));
    assert.ok(telemetry.some((e) => e.type === 'lease_renewed'));
    assert.ok(telemetry.some((e) => e.type === 'lease_released'));
  });

  it('ProjectionRunner orchestrates batch with lease and checkpoint', async () => {
    const telemetry: ProjectionTelemetryEvent[] = [];
    const infra = createProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
      registrations: [testRegistration(noopHandler())],
    });

    const run = await infra.runner.run({
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      holderId: 'runner-1',
      envelopes: [infraProbeEnvelope()],
    });

    assert.equal(run.ok, true);
    if (run.ok) {
      assert.equal(run.value.processed, 1);
      assert.ok(run.value.checkpoint);
    }

    assert.ok(telemetry.some((e) => e.type === 'projection_completed'));
  });

  it('ProjectionRunner pause skips envelopes and cancel stops batch', async () => {
    const infra = createProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      registrations: [testRegistration(noopHandler())],
    });

    await infra.runner.pause('test-proj', 'test-group');
    const paused = await infra.runner.run({
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      holderId: 'runner-pause',
      envelopes: [infraProbeEnvelope(), infraProbeEnvelope()],
    });
    assert.equal(paused.ok, true);
    if (paused.ok) {
      assert.equal(paused.value.processed, 0);
      assert.equal(paused.value.skipped, 2);
    }

    await infra.runner.resume('test-proj', 'test-group');
    await infra.runner.cancel('test-proj', 'test-group');
    const cancelled = await infra.runner.run({
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      holderId: 'runner-cancel',
      envelopes: [infraProbeEnvelope()],
    });
    assert.equal(cancelled.ok, true);
    if (cancelled.ok) assert.equal(cancelled.value.processed, 0);
  });

  it('ProjectionRebuildEngine prepare and cancel rebuild', async () => {
    const telemetry: ProjectionTelemetryEvent[] = [];
    const infra = createProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      projectionName: 'test-proj',
      consumerGroup: 'test-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const prepared = await infra.rebuildEngine.prepareRebuild({
      rebuildId: 'rebuild-001',
      identity: testIdentity(),
      dryRun: true,
    });
    assert.equal(prepared.ok, true);
    if (prepared.ok) assert.equal(prepared.value.status, 'prepared');

    const executed = await infra.rebuildEngine.executeRebuild('rebuild-001');
    assert.equal(executed.ok, true);
    if (executed.ok) assert.equal(executed.value.status, 'running');

    const cancelled = await infra.rebuildEngine.cancelRebuild('rebuild-001');
    assert.equal(cancelled.ok, true);
    if (cancelled.ok) assert.equal(cancelled.value.status, 'cancelled');

    assert.ok(telemetry.some((e) => e.type === 'rebuild_started'));
    assert.ok(telemetry.some((e) => e.type === 'rebuild_completed'));
  });

  it('ProjectionCheckpointRepository saves and loads cursor', async () => {
    const repo = createProjectionCheckpointRepository();
    await repo.save({
      projectionName: 'p',
      projectionVersion: '1.0.0',
      consumerGroup: 'g',
      eventId: asEventId('evt-1'),
      sequence: 10,
      timestamp: FIXED_CLOCK.now(),
      schemaVersion: '1.0.0',
    });

    const loaded = await repo.load('p', 'g');
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.value!.sequence, 10);
      assert.equal(loaded.value!.projectionVersion, '1.0.0');
    }
  });
});
