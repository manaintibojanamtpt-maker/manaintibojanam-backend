import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_SDK_FEATURE_FLAG_DEFAULTS,
} from '../menu/featureFlags/featureFlags';
import type { MenuFeatureFlagReader } from '../menu/featureFlags/featureFlags';
import {
  createMenuProjectionInfrastructure,
  createMenuProjectionCoordinator,
  createMenuProjectionRepository,
  isMenuProjectionEnabled,
} from '../menu/projection/MenuProjectionFactory';
import { MenuProjectionCheckpointRepository } from '../menu/projection/MenuProjectionCheckpointRepository';
import { MenuProjectionSnapshotRepository } from '../menu/projection/MenuProjectionSnapshotRepository';
import { MenuProjectionRepository } from '../menu/projection/MenuProjectionRepository';
import type { MenuProjectionTelemetryEvent } from '../menu/projection/MenuProjectionTelemetry';
import { MENU_PROJECTION_FOUNDATION_IDENTITY } from '../../domain/menu/projection/MenuProjectionMetadata';
import { sdkFail } from '../core/resultHelpers';

const PROJECTION_FLAGS: MenuFeatureFlagReader = (flag) =>
  flag === 'FF_MENU_PROJECTION_ENABLED';

const executeRequest = () => ({
  projectionName: MENU_PROJECTION_FOUNDATION_IDENTITY.projectionName,
  projectionVersion: MENU_PROJECTION_FOUNDATION_IDENTITY.projectionVersion,
  consumerGroup: MENU_PROJECTION_FOUNDATION_IDENTITY.consumerGroup,
  schemaVersion: MENU_PROJECTION_FOUNDATION_IDENTITY.schemaVersion,
  executionId: 'menu-proj-exec-001',
  eventId: 'evt-menu-001',
  sequence: 1,
  processedEvents: 1,
  failedEvents: 0,
});

describe('Menu projection foundation (M7 PR-6)', () => {
  it('defaults FF_MENU_PROJECTION_ENABLED to off', () => {
    assert.equal(
      MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_ENABLED,
      false
    );
    assert.equal(isMenuProjectionEnabled(), false);
  });

  it('createMenuProjectionInfrastructure returns repositories and coordinator', () => {
    const infra = createMenuProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
    });
    assert.ok(infra.repository);
    assert.ok(infra.checkpointRepository);
    assert.ok(infra.snapshotRepository);
    assert.ok(infra.coordinator);
  });

  it('createMenuProjectionCoordinator returns NOT_CONFIGURED when flag is off', async () => {
    const coordinator = createMenuProjectionCoordinator();
    const result = await coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createMenuProjectionRepository returns in-memory store', async () => {
    const repository = createMenuProjectionRepository();
    const save = await repository.saveExecution({
      executionId: 'exec-store-1',
      projectionName: 'menu-proj',
      consumerGroup: 'menu-group',
      startedAt: '2026-06-27T10:00:00.000Z',
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
    const checkpointRepo = new MenuProjectionCheckpointRepository();
    const checkpoint = {
      projectionName: 'menu-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'menu-group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-06-27T10:00:00.000Z',
      eventId: 'evt-1',
      sequence: 10,
    };
    const save = await checkpointRepo.save(checkpoint);
    assert.equal(save.ok, true);
    const loaded = await checkpointRepo.load('menu-proj', 'menu-group');
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.value?.sequence, 10);
    assert.equal(checkpointRepo.size(), 1);
  });

  it('snapshot repository stores metadata only', async () => {
    const snapshotRepo = new MenuProjectionSnapshotRepository();
    const snapshot = {
      snapshotId: 'snap-1',
      projectionName: 'menu-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'menu-group',
      schemaVersion: '0.1.0',
      capturedAt: '2026-06-27T10:00:00.000Z',
      lastEventId: 'evt-1',
      lastSequence: 10,
    };
    const save = await snapshotRepo.save(snapshot);
    assert.equal(save.ok, true);
    const loaded = await snapshotRepo.load('menu-proj', 'menu-group');
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.value?.snapshotId, 'snap-1');
    assert.equal(snapshotRepo.historySize(), 1);
  });

  it('coordinator persists checkpoint, snapshot, and execution metadata', async () => {
    const telemetry: MenuProjectionTelemetryEvent[] = [];
    const infra = createMenuProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await infra.coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.status, 'completed');
    assert.equal(result.value.checkpoint?.eventId, 'evt-menu-001');
    assert.equal(result.value.snapshot?.snapshotId, 'menu-proj-exec-001-snapshot');

    const checkpoint = await infra.checkpointRepository.load(
      MENU_PROJECTION_FOUNDATION_IDENTITY.projectionName,
      MENU_PROJECTION_FOUNDATION_IDENTITY.consumerGroup
    );
    assert.equal(checkpoint.ok, true);
    if (!checkpoint.ok) return;
    assert.equal(checkpoint.value?.sequence, 1);

    const execution = await infra.repository.getExecution('menu-proj-exec-001');
    assert.equal(execution.ok, true);
    if (!execution.ok) return;
    assert.equal(execution.value?.status, 'completed');

    assert.ok(telemetry.some((event) => event.type === 'menu_projection_started'));
    assert.ok(telemetry.some((event) => event.type === 'menu_projection_completed'));
    assert.ok(telemetry.some((event) => event.type === 'menu_projection_checkpoint_saved'));
    assert.ok(telemetry.some((event) => event.type === 'menu_projection_snapshot_saved'));
  });

  it('coordinator returns failed status when failedEvents > 0', async () => {
    const infra = createMenuProjectionInfrastructure({
      featureFlags: PROJECTION_FLAGS,
    });
    const result = await infra.coordinator.coordinateExecution({
      ...executeRequest(),
      executionId: 'menu-proj-exec-failed',
      processedEvents: 0,
      failedEvents: 1,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.status, 'failed');
    assert.equal(result.value.snapshot, undefined);
  });

  it('coordinator maps validation errors to VALIDATION', async () => {
    const infra = createMenuProjectionInfrastructure({
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
    const coordinator = createMenuProjectionCoordinator({
      featureFlags: PROJECTION_FLAGS,
      repository: failingRepository,
    });
    const result = await coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('injected coordinator bypasses flag gate', async () => {
    const repository = new MenuProjectionRepository();
    const coordinator = createMenuProjectionCoordinator({
      featureFlags: () => false,
      coordinator: createMenuProjectionCoordinator({
        featureFlags: PROJECTION_FLAGS,
        repository,
      }),
    });
    const result = await coordinator.coordinateExecution(executeRequest());
    assert.equal(result.ok, true);
  });
});
