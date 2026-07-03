import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_CATALOG_EVENT_TYPES,
  MENU_CATALOG_READ_PROJECTION_VERSION,
  isSupportedMenuCatalogProjectionEvent,
} from '../MenuProjectionMetadata';
import {
  applyMenuCatalogProjectionDeleted,
  applyMenuCatalogProjectionUpdated,
  buildMenuCatalogProjectionFromCreated,
  resolveMenuCatalogProjectionTransition,
} from '../MenuProjectionBuilders';
import {
  assertNoForbiddenPayloadFieldsInReadModel,
  canApplyCatalogDelete,
  canApplyCatalogUpdate,
  validateMenuCatalogProjectionEventType,
  validateMenuCatalogProjectionReadModel,
} from '../MenuProjectionValidation';

const baseContext = () => ({
  eventId: 'evt-catalog-001',
  eventType: MENU_CATALOG_EVENT_TYPES.CREATED,
  schemaVersion: '1.0.0',
  occurredAt: '2026-06-27T10:00:00.000Z',
  branchId: 'branch-001',
});

const createdPayload = () => ({
  catalogId: 'catalog-001',
  tenantId: 'tenant-001',
  catalogVersion: '1.0.0',
  status: 'ACTIVE',
  categoryCount: 3,
  itemCount: 12,
  modifierGroupCount: 2,
  comboCount: 1,
});

describe('Menu catalog shadow projection domain (M7 PR-7)', () => {
  it('exports supported catalog event types', () => {
    assert.equal(MENU_CATALOG_EVENT_TYPES.CREATED, 'menu.catalog.created.v1');
    assert.equal(MENU_CATALOG_EVENT_TYPES.UPDATED, 'menu.catalog.updated.v1');
    assert.equal(MENU_CATALOG_EVENT_TYPES.DELETED, 'menu.catalog.deleted.v1');
    assert.equal(isSupportedMenuCatalogProjectionEvent('menu.catalog.created.v1'), true);
    assert.equal(isSupportedMenuCatalogProjectionEvent('menu.item.created.v1'), false);
  });

  it('buildMenuCatalogProjectionFromCreated builds catalog-centric read model', () => {
    const model = buildMenuCatalogProjectionFromCreated(createdPayload(), baseContext());
    assert.equal(model.catalogId, 'catalog-001');
    assert.equal(model.tenantId, 'tenant-001');
    assert.equal(model.branchId, 'branch-001');
    assert.equal(model.categoryCount, 3);
    assert.equal(model.itemCount, 12);
    assert.equal(model.projectionVersion, MENU_CATALOG_READ_PROJECTION_VERSION);
  });

  it('applyMenuCatalogProjectionUpdated merges counts and version', () => {
    const current = buildMenuCatalogProjectionFromCreated(createdPayload(), baseContext());
    const updated = applyMenuCatalogProjectionUpdated(
      current,
      {
        catalogId: 'catalog-001',
        tenantId: 'tenant-001',
        catalogVersion: '1.1.0',
        itemCount: 15,
      },
      {
        ...baseContext(),
        eventType: MENU_CATALOG_EVENT_TYPES.UPDATED,
      }
    );
    assert.equal(updated.catalogVersion, '1.1.0');
    assert.equal(updated.itemCount, 15);
    assert.equal(updated.categoryCount, 3);
  });

  it('applyMenuCatalogProjectionDeleted marks catalog deleted', () => {
    const current = buildMenuCatalogProjectionFromCreated(createdPayload(), baseContext());
    const deleted = applyMenuCatalogProjectionDeleted(
      current,
      {
        catalogId: 'catalog-001',
        tenantId: 'tenant-001',
        status: 'DELETED',
      },
      {
        ...baseContext(),
        eventType: MENU_CATALOG_EVENT_TYPES.DELETED,
      }
    );
    assert.equal(deleted.status, 'DELETED');
    assert.equal(deleted.itemCount, 12);
  });

  it('resolveMenuCatalogProjectionTransition maps event types', () => {
    assert.equal(resolveMenuCatalogProjectionTransition(MENU_CATALOG_EVENT_TYPES.CREATED), 'create');
    assert.equal(resolveMenuCatalogProjectionTransition(MENU_CATALOG_EVENT_TYPES.UPDATED), 'update');
    assert.equal(resolveMenuCatalogProjectionTransition(MENU_CATALOG_EVENT_TYPES.DELETED), 'delete');
    assert.equal(resolveMenuCatalogProjectionTransition('menu.item.created.v1'), 'unsupported');
  });

  it('validateMenuCatalogProjectionReadModel rejects negative counts', () => {
    const model = buildMenuCatalogProjectionFromCreated(
      { ...createdPayload(), itemCount: -1 },
      baseContext()
    );
    const errors = validateMenuCatalogProjectionReadModel(model);
    assert.ok(errors.some((error) => error.includes('itemCount')));
  });

  it('validateMenuCatalogProjectionEventType rejects unsupported events', () => {
    const errors = validateMenuCatalogProjectionEventType('menu.item.created.v1');
    assert.ok(errors.length > 0);
  });

  it('assertNoForbiddenPayloadFieldsInReadModel blocks pricing and inventory fields', () => {
    const errors = assertNoForbiddenPayloadFieldsInReadModel({
      catalogId: 'catalog-001',
      price: 100,
    });
    assert.ok(errors.some((error) => error.includes('price')));
  });

  it('canApplyCatalogUpdate and canApplyCatalogDelete require existing model', () => {
    assert.equal(canApplyCatalogUpdate(null), false);
    assert.equal(canApplyCatalogDelete(null), false);
    const model = buildMenuCatalogProjectionFromCreated(createdPayload(), baseContext());
    assert.equal(canApplyCatalogUpdate(model), true);
    assert.equal(canApplyCatalogDelete(model), true);
  });
});
