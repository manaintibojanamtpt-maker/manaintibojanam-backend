import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_SDK_FEATURE_FLAG_DEFAULTS,
  type MenuFeatureFlagReader,
} from '../menu/featureFlags/featureFlags';
import { createMenuProjectionWorkerBundle } from '../menu/projections/menu/createMenuProjectionWorker';
import { MenuProjectionWorker } from '../menu/projections/menu/MenuProjectionWorker';
import { MENU_CATALOG_EVENT_TYPES } from '../../domain/menu/projections/menu/MenuProjectionMetadata';
import type { MenuCatalogProjectionTelemetryEvent } from '../menu/projections/menu/MenuProjectionTelemetry';
import type {
  MenuCatalogCreatedPayload,
  MenuCatalogDeletedPayload,
  MenuCatalogUpdatedPayload,
} from '../../domain/menu/projections/menu/MenuProjectionMetadata';
import type { MenuProjectionEnvelope } from '../menu/projections/menu/menuProjectionPorts';

const PROJECTION_FLAGS: MenuFeatureFlagReader = (flag) => flag === 'FF_MENU_PROJECTION_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-27T10:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `menu-catalog-snap-${++n}`;
  })(),
};

const catalogPayload = (): MenuCatalogCreatedPayload => ({
  catalogId: 'catalog-proj-001',
  tenantId: 'tenant-proj-001',
  catalogVersion: '1.0.0',
  status: 'ACTIVE',
  categoryCount: 4,
  itemCount: 20,
  modifierGroupCount: 3,
  comboCount: 2,
});

const envelope = <TPayload>(
  type: string,
  payload: TPayload,
  eventId = 'evt-catalog-001'
): MenuProjectionEnvelope<TPayload> => ({
  header: {
    eventId,
    type,
    version: '1.0.0',
    aggregateId: 'catalog-proj-001',
    occurredAt: '2026-06-27T10:00:00.000Z',
  },
  metadata: {
    correlationId: 'corr-catalog-001',
    custom: { branchId: 'branch-proj-001' },
  },
  payload,
});

describe('Menu catalog shadow projection (M7 PR-7)', () => {
  it('defaults FF_MENU_PROJECTION_ENABLED to off', () => {
    assert.equal(MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_ENABLED, false);
  });

  it('MenuProjectionWorker skips when flag is off', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const result = await bundle.worker.process(
      envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload())
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('processes menu.catalog.created.v1 and persists read model', async () => {
    const telemetry: MenuCatalogProjectionTelemetryEvent[] = [];
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await bundle.worker.process(
      envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload())
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, true);
    assert.equal(result.value.eventType, MENU_CATALOG_EVENT_TYPES.CREATED);
    assert.ok(result.value.readModel);
    assert.equal(result.value.readModel!.catalogId, 'catalog-proj-001');
    assert.equal(result.value.readModel!.tenantId, 'tenant-proj-001');
    assert.equal(result.value.readModel!.branchId, 'branch-proj-001');
    assert.equal(result.value.readModel!.categoryCount, 4);
    assert.equal(result.value.readModel!.projectionVersion, '1.0.0');

    const stored = await bundle.repository.get('catalog-proj-001');
    assert.equal(stored.ok, true);
    if (!stored.ok) return;
    assert.equal(stored.value?.status, 'ACTIVE');
    assert.equal(stored.value?.itemCount, 20);

    const snapshot = await bundle.snapshotStore.loadLatest('catalog-proj-001');
    assert.equal(snapshot.ok, true);
    if (!snapshot.ok) return;
    assert.ok(snapshot.value);

    assert.ok(telemetry.some((event) => event.type === 'menu_projection_started'));
    assert.ok(telemetry.some((event) => event.type === 'menu_projection_processed'));
    assert.ok(telemetry.some((event) => event.type === 'menu_projection_completed'));
    assert.ok(telemetry.some((event) => event.type === 'menu_projection_snapshot_saved'));
  });

  it('processes menu.catalog.updated.v1 after create', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await bundle.worker.process(envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload()));

    const updatedPayload: MenuCatalogUpdatedPayload = {
      catalogId: 'catalog-proj-001',
      tenantId: 'tenant-proj-001',
      catalogVersion: '1.1.0',
      status: 'ACTIVE',
      itemCount: 25,
    };

    const result = await bundle.worker.process(
      envelope(MENU_CATALOG_EVENT_TYPES.UPDATED, updatedPayload, 'evt-catalog-002')
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, true);
    assert.equal(result.value.readModel!.catalogVersion, '1.1.0');
    assert.equal(result.value.readModel!.itemCount, 25);
    assert.equal(result.value.readModel!.categoryCount, 4);
  });

  it('processes menu.catalog.deleted.v1 after create', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await bundle.worker.process(envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload()));

    const deletedPayload: MenuCatalogDeletedPayload = {
      catalogId: 'catalog-proj-001',
      tenantId: 'tenant-proj-001',
      status: 'DELETED',
    };

    const result = await bundle.worker.process(
      envelope(MENU_CATALOG_EVENT_TYPES.DELETED, deletedPayload, 'evt-catalog-003')
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, true);
    assert.equal(result.value.readModel!.status, 'DELETED');
  });

  it('returns applied false when update arrives without existing read model', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const updatedPayload: MenuCatalogUpdatedPayload = {
      catalogId: 'catalog-proj-001',
      tenantId: 'tenant-proj-001',
      catalogVersion: '1.1.0',
    };

    const result = await bundle.worker.process(
      envelope(MENU_CATALOG_EVENT_TYPES.UPDATED, updatedPayload)
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, false);
    assert.match(result.value.reason ?? '', /without existing read model/i);
  });

  it('rejects unsupported event types with validation failure', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await bundle.worker.process(
      envelope('menu.item.created.v1', {
        catalogId: 'catalog-proj-001',
        tenantId: 'tenant-proj-001',
        catalogVersion: '1.0.0',
        status: 'ACTIVE',
        categoryCount: 1,
        itemCount: 1,
        modifierGroupCount: 0,
        comboCount: 0,
      })
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });

  it('rejects envelope without correlationId', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const invalid = {
      ...envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload()),
      metadata: {},
    };
    const result = await bundle.worker.process(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });

  it('listByTenant and count expose repository persistence', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await bundle.worker.process(envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload()));

    const listed = await bundle.repository.listByTenant('tenant-proj-001', 10);
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);

    const count = await bundle.repository.count();
    assert.equal(count.ok, true);
    if (!count.ok) return;
    assert.equal(count.value, 1);
  });

  it('read model excludes forbidden pricing and inventory fields', async () => {
    const bundle = createMenuProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await bundle.worker.process(
      envelope(MENU_CATALOG_EVENT_TYPES.CREATED, catalogPayload())
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const record = result.value.readModel as unknown as Record<string, unknown>;
    assert.equal('price' in record, false);
    assert.equal('inventory' in record, false);
    assert.equal('searchIndex' in record, false);
    assert.equal('branchOverrides' in record, false);
  });

  it('MenuProjectionWorker exposes projection identity and supported events', () => {
    const identity = MenuProjectionWorker.projectionIdentity();
    assert.equal(identity.projectionName, 'menu-catalog-read-shadow');
    assert.equal(identity.ownerPlatform, 'M7-CatalogKernel');
    assert.ok(MenuProjectionWorker.supportedEventTypes().includes('menu.catalog.created.v1'));
  });
});
