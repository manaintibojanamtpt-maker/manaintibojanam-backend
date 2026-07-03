import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PRICING_SDK_FEATURE_FLAG_DEFAULTS } from '../pricing/featureFlags/featureFlags';
import type { PricingFeatureFlagReader } from '../pricing/featureFlags/featureFlags';
import {
  createPricingProjectionInfrastructure,
  createPricingProjectionCoordinator,
  createPricingProjectionRepository,
  isPricingProjectionEnabled,
} from '../pricing/projection/PricingProjectionFactory';
import { PricingProjectionCheckpointRepository } from '../pricing/projection/PricingProjectionCheckpointRepository';
import { PricingProjectionSnapshotRepository } from '../pricing/projection/PricingProjectionSnapshotRepository';
import { PricingProjectionRepository } from '../pricing/projection/PricingProjectionRepository';
import type { PricingProjectionTelemetryEvent } from '../pricing/projection/PricingProjectionTelemetry';
import { PRICING_PROJECTION_FOUNDATION_IDENTITY } from '../../domain/pricing/projection/PricingProjectionMetadata';
import { buildPricingProjectionCheckpoint } from '../../domain/pricing/projection/PricingProjectionCheckpoint';
import { sdkFail } from '../core/resultHelpers';

const PROJECTION_FLAGS: PricingFeatureFlagReader = (flag) =>
  flag === 'FF_PRICING_PROJECTION_ENABLED';

const executeRequest = () => ({
  projectionName: PRICING_PROJECTION_FOUNDATION_IDENTITY.projectionName,
  projectionVersion: PRICING_PROJECTION_FOUNDATION_IDENTITY.projectionVersion,
  consumerGroup: PRICING_PROJECTION_FOUNDATION_IDENTITY.consumerGroup,
  schemaVersion: PRICING_PROJECTION_FOUNDATION_IDENTITY.schemaVersion,
  executionId: 'pricing-proj-exec-001',
  eventId: 'evt-pricing-001',
  sequence: 1,
  processedEvents: 1,
  failedEvents: 0,
});

describe('Pricing projection foundation (M8 PR-6)', () => {
  it('defaults FF_PRICING_PROJECTION_ENABLED to off', () => {
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_ENABLED,
      false
    );
    assert.equal(isPricingProjectionEnabled(), false);
  });

  it('createPricingProjectionInfrastructure returns repositories and coordinator', () => {
    const infra = createPricingProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
    });
    assert.ok(infra.repository);
    assert.ok(infra.checkpointRepository);
    assert.ok(infra.snapshotRepository);
    assert.ok(infra.coordinator);
  });

  it('createPricingProjectionCoordinator returns NOT_CONFIGURED when flag is off', async () => {
    const coordinator = createPricingProjectionCoordinator();
    const result = await coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createPricingProjectionRepository returns in-memory store', async () => {
    const repository = createPricingProjectionRepository();
    const save = await repository.saveExecution({
      executionId: 'exec-store-1',
      projectionName: 'pricing-proj',
      consumerGroup: 'pricing-group',
      startedAt: '2026-07-03T10:00:00.000Z',
      status: 'completed',
      processedEvents: 1,
      failedEvents: 0,
      retryCount: 0,
    });
    assert.equal(save.ok, true);
    const loaded = await repository.getExecution('exec-store-1');
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.value?.executionId, 'exec-store-1');
  });

  it('checkpoint repository persists cursor metadata', async () => {
    const checkpointRepo = new PricingProjectionCheckpointRepository();
    const checkpoint = {
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'pricing-group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-07-03T10:00:00.000Z',
      eventId: 'evt-1',
      sequence: 10,
    };
    const save = await checkpointRepo.save(checkpoint);
    assert.equal(save.ok, true);
    const loaded = await checkpointRepo.load('pricing-proj', 'pricing-group');
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.value?.sequence, 10);
    assert.equal(checkpointRepo.size(), 1);
  });

  it('snapshot repository stores metadata with checkpoint', async () => {
    const snapshotRepo = new PricingProjectionSnapshotRepository();
    const checkpoint = buildPricingProjectionCheckpoint({
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'pricing-group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-07-03T10:00:00.000Z',
      eventId: 'evt-1',
      sequence: 10,
    })!;
    const snapshot = {
      snapshotId: 'snap-1',
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      checkpoint,
      capturedAt: '2026-07-03T10:00:00.000Z',
      metadata: { source: 'foundation' },
    };
    const save = await snapshotRepo.save(snapshot);
    assert.equal(save.ok, true);
    const loaded = await snapshotRepo.load('pricing-proj', 'pricing-group');
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.value?.snapshotId, 'snap-1');
    assert.equal(snapshotRepo.historySize(), 1);
  });

  it('coordinator persists checkpoint, snapshot, and execution metadata', async () => {
    const telemetry: PricingProjectionTelemetryEvent[] = [];
    const infra = createPricingProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await infra.coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.status, 'completed');
    assert.equal(result.value.checkpoint?.eventId, 'evt-pricing-001');
    assert.equal(result.value.snapshot?.snapshotId, 'pricing-proj-exec-001-snapshot');

    const checkpoint = await infra.checkpointRepository.load(
      PRICING_PROJECTION_FOUNDATION_IDENTITY.projectionName,
      PRICING_PROJECTION_FOUNDATION_IDENTITY.consumerGroup
    );
    assert.equal(checkpoint.ok, true);
    if (!checkpoint.ok) return;
    assert.equal(checkpoint.value?.sequence, 1);

    const execution = await infra.repository.getExecution('pricing-proj-exec-001');
    assert.equal(execution.ok, true);
    if (!execution.ok) return;
    assert.equal(execution.value?.status, 'completed');

    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_started'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_completed'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_checkpoint_saved'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_snapshot_saved'));
  });

  it('coordinator returns failed status when failedEvents > 0', async () => {
    const infra = createPricingProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
    });
    const result = await infra.coordinator.coordinateExecution({
      ...executeRequest(),
      executionId: 'pricing-proj-exec-failed',
      processedEvents: 0,
      failedEvents: 1,
      errors: ['mapping failed'],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.status, 'failed');
    assert.equal(result.value.snapshot, undefined);
    assert.equal(result.value.execution.errors?.[0], 'mapping failed');
  });

  it('coordinator maps validation errors to VALIDATION', async () => {
    const infra = createPricingProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
    });
    const result = await infra.coordinator.coordinateExecution({
      ...executeRequest(),
      projectionName: '',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('coordinator propagates repository failures', async () => {
    const failingRepository = {
      saveExecution: async () => sdkFail({ code: 'UNAVAILABLE', message: 'store down' }),
      getExecution: async () => ({ ok: true, value: null }),
      listExecutions: async () => ({ ok: true, value: [] }),
    };
    const coordinator = createPricingProjectionCoordinator({
      featureFlags: PROJECTION_FLAGS,
      repository: failingRepository,
    });
    const result = await coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('injected coordinator bypasses flag gate', async () => {
    const repository = new PricingProjectionRepository();
    const coordinator = createPricingProjectionCoordinator({
      featureFlags: () => false,
      coordinator: createPricingProjectionCoordinator({
        featureFlags: PROJECTION_FLAGS,
        repository,
      }),
    });
    const result = await coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, true);
  });

  it('repository listExecutions returns recent records', async () => {
    const repository = new PricingProjectionRepository();
    await repository.saveExecution({
      executionId: 'exec-a',
      projectionName: 'pricing-proj',
      consumerGroup: 'pricing-group',
      startedAt: '2026-07-03T10:00:00.000Z',
      status: 'completed',
      processedEvents: 1,
      failedEvents: 0,
      retryCount: 0,
    });
    const listed = await repository.listExecutions('pricing-proj', 10);
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);
  });
});
