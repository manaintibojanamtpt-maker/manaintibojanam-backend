import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createProjectionRuntimeInfrastructure } from '../events/projection/runtime/ProjectionRuntimeFactory';
import { createProjectionInfrastructure } from '../events/projection/ProjectionInfrastructureFactory';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { ProjectionHandlerPort } from '../events/contracts/projectionPorts';
import type { ProjectionRuntimeTelemetryEvent } from '../events/projection/runtime/ProjectionRuntimeTelemetry';
import {
  asAggregateId,
  asCorrelationId,
  asEventId,
  asEventTypeName,
} from '../events/types/branded';
import type { EventEnvelope } from '../events/dto/EventEnvelope';
import type { ProjectionIdentity } from '../../domain/events/projection/shared/ProjectionIdentityTypes';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';

const RUNTIME_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_RUNTIME_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-26T20:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `runtime-uuid-${++n}`;
  })(),
};

const testIdentity = (): ProjectionIdentity => ({
  projectionName: 'infra-runtime-proj',
  projectionVersion: '1.0.0',
  consumerGroup: 'runtime-group',
  ownerPlatform: 'M6',
  replaySupported: true,
  checkpointStrategy: 'event_id',
});

const noopHandler = (): ProjectionHandlerPort => ({
  handle: async () => ({ ok: true, value: undefined }),
});

const infraProbeEnvelope = (): EventEnvelope<{ probe: string }> => ({
  header: {
    eventId: asEventId('evt-runtime-001'),
    type: asEventTypeName('infra.projection.probe'),
    version: '1.0.0',
    aggregateType: 'ProjectionProbe',
    aggregateId: asAggregateId('probe-runtime-001'),
    occurredAt: '2026-06-26T20:00:00.000Z',
  },
  metadata: {
    correlationId: asCorrelationId('corr-runtime-001'),
  },
  payload: { probe: 'runtime-foundation' },
});

describe('EventSDK projection runtime (M6 PR-6)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_EVENT_PROJECTION_RUNTIME_ENABLED to off', () => {
    assert.equal(
      EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_EVENT_PROJECTION_RUNTIME_ENABLED,
      false
    );
  });

  it('createProjectionRuntimeInfrastructure returns stub when flags off', async () => {
    const projection = createProjectionInfrastructure({
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const runtimeInfra = createProjectionRuntimeInfrastructure({
      runner: projection.runner,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const result = await runtimeInfra.runtime.execute({
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      projectionVersion: '1.0.0',
      schemaVersion: '1.0.0',
      holderId: 'holder-1',
      envelopes: [infraProbeEnvelope()],
    });
    assert.equal(result.ok, false);
  });

  it('ProjectionRuntime executes worker and persists checkpoint', async () => {
    const telemetry: ProjectionRuntimeTelemetryEvent[] = [];
    const projection = createProjectionInfrastructure({
      featureFlags: RUNTIME_FLAGS,
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      registrations: [
        {
          identity: testIdentity(),
          eventTypes: [asEventTypeName('infra.projection.probe')],
          handlerVersion: '1.0.0',
          handler: noopHandler(),
        },
      ],
    });
    const runtimeInfra = createProjectionRuntimeInfrastructure({
      featureFlags: RUNTIME_FLAGS,
      runner: projection.runner,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await runtimeInfra.runtime.execute({
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      projectionVersion: '1.0.0',
      schemaVersion: '1.0.0',
      holderId: 'holder-1',
      envelopes: [infraProbeEnvelope()],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.processed, 1);
      assert.ok(result.value.checkpoint);
      assert.equal(result.value.checkpoint!.eventId, 'evt-runtime-001');
      assert.equal(result.value.checkpoint!.projectionVersion, '1.0.0');
      assert.equal(result.value.checkpoint!.schemaVersion, '1.0.0');
      assert.ok(result.value.execution);
      assert.equal(result.value.execution!.processedEvents, 1);
      assert.ok(result.value.statistics);
      assert.equal(result.value.statistics!.processed, 1);
    }

    assert.ok(telemetry.some((e) => e.type === 'projection_runtime_started'));
    assert.ok(telemetry.some((e) => e.type === 'projection_runtime_completed'));
    assert.ok(telemetry.some((e) => e.type === 'projection_snapshot_saved'));
    assert.ok(telemetry.some((e) => e.type === 'projection_execution_recorded'));
    assert.ok(telemetry.some((e) => e.type === 'projection_statistics_updated'));
  });

  it('ProjectionPersistenceAdapter stores execution history', async () => {
    const projection = createProjectionInfrastructure({
      featureFlags: RUNTIME_FLAGS,
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      registrations: [
        {
          identity: testIdentity(),
          eventTypes: [asEventTypeName('infra.projection.probe')],
          handlerVersion: '1.0.0',
          handler: noopHandler(),
        },
      ],
    });
    const runtimeInfra = createProjectionRuntimeInfrastructure({
      featureFlags: RUNTIME_FLAGS,
      runner: projection.runner,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await runtimeInfra.runtime.execute({
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      projectionVersion: '1.0.0',
      schemaVersion: '1.0.0',
      holderId: 'holder-1',
      envelopes: [infraProbeEnvelope()],
    });

    const checkpoint = await runtimeInfra.runtime.getCheckpoint(
      'infra-runtime-proj',
      'runtime-group'
    );
    assert.equal(checkpoint.ok, true);
    if (checkpoint.ok) assert.ok(checkpoint.value);

    const stats = await runtimeInfra.runtime.getStatistics(
      'infra-runtime-proj',
      'runtime-group'
    );
    assert.equal(stats.ok, true);
    if (stats.ok) {
      assert.equal(stats.value.checkpointCount, 1);
      assert.equal(stats.value.processed, 1);
    }
  });

  it('requires all three runtime flags', async () => {
    const projection = createProjectionInfrastructure({
      featureFlags: RUNTIME_FLAGS,
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      registrations: [
        {
          identity: testIdentity(),
          eventTypes: [asEventTypeName('infra.projection.probe')],
          handlerVersion: '1.0.0',
          handler: noopHandler(),
        },
      ],
    });
    const twoFlagsOnly: EventFeatureFlagReader = (flag) =>
      flag !== 'FF_EVENT_PROJECTION_RUNTIME_ENABLED' && RUNTIME_FLAGS(flag);

    const runtimeInfra = createProjectionRuntimeInfrastructure({
      featureFlags: twoFlagsOnly,
      runner: projection.runner,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await runtimeInfra.runtime.execute({
      projectionName: 'infra-runtime-proj',
      consumerGroup: 'runtime-group',
      projectionVersion: '1.0.0',
      schemaVersion: '1.0.0',
      holderId: 'holder-1',
      envelopes: [infraProbeEnvelope()],
    });
    assert.equal(result.ok, false);
  });
});
