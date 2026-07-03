import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMenuRepository } from '../menu/repository/MenuRepositoryFactory';
import { createStubMenuRepository } from '../menu/repository/StubMenuRepository';
import { createMenuRepositoryAdapter } from '../menu/repository/MenuRepositoryAdapter';
import type { MenuPersistencePort } from '../menu/repository/MenuRepositoryPorts';
import type {
  CategoryRecord,
  ComboRecord,
  MenuItemRecord,
  MenuRecord,
  MenuSearchRecordResult,
  ModifierGroupRecord,
} from '../menu/repository/MenuPersistenceModels';
import {
  filterActiveCategoryRecords,
  filterActiveItemRecords,
  mapCategoryRecord,
  mapComboRecord,
  mapMenuItemRecord,
  mapMenuRecordToMenu,
  mapMenuSearchRecordResult,
  mapPersistenceError,
  sortCategoryRecords,
} from '../menu/repository/MenuRepositoryMapper';
import { sdkError } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { ComboId, MenuItemId } from '../menu/types/branded';

const tenantId = 'tenant-repo-001' as TenantId;

const menuRecord = (): MenuRecord => ({
  menuId: 'menu-1',
  tenantId: String(tenantId),
  name: 'Lunch Menu',
  version: '1.0.0',
  updatedAt: '2026-06-27T10:00:00.000Z',
  metadataSource: 'mock',
  metadataSchemaVersion: '1.0.0',
});

const categoryRecords = (): CategoryRecord[] => [
  {
    categoryId: 'cat-2',
    tenantId: String(tenantId),
    name: 'Desserts',
    sortOrder: 2,
    itemIds: ['item-2'],
    active: true,
  },
  {
    categoryId: 'cat-1',
    tenantId: String(tenantId),
    name: 'Mains',
    sortOrder: 1,
    itemIds: ['item-1'],
    active: true,
  },
  {
    categoryId: 'cat-inactive',
    tenantId: String(tenantId),
    name: 'Hidden',
    sortOrder: 3,
    itemIds: [],
    active: false,
  },
];

const itemRecords = (): MenuItemRecord[] => [
  {
    itemId: 'item-1',
    tenantId: String(tenantId),
    name: 'Thali',
    kind: 'item',
    categoryId: 'cat-1',
    price: { amount: 120, currency: 'INR' },
    availability: { available: true },
    active: true,
  },
  {
    itemId: 'item-2',
    tenantId: String(tenantId),
    name: 'Kheer',
    kind: 'item',
    categoryId: 'cat-2',
    price: { amount: 60, currency: 'INR' },
    availability: { available: false, reason: 'Sold out' },
    active: false,
  },
];

const comboRecords = (): ComboRecord[] => [
  {
    comboId: 'combo-1',
    tenantId: String(tenantId),
    name: 'Family Pack',
    components: [{ itemId: 'item-1', quantity: 2 }],
    price: { amount: 220, currency: 'INR' },
    availability: { available: true },
    active: true,
  },
];

const createMockPersistencePort = (
  overrides: Partial<MenuPersistencePort> = {}
): MenuPersistencePort => ({
  getMenu: async () => ({ ok: true, value: menuRecord() }),
  getMenuItem: async (query) => {
    const item = itemRecords().find((record) => record.itemId === query.itemId);
    if (!item) {
      return { ok: false, error: sdkError('NOT_FOUND', 'Item not found') };
    }
    return { ok: true, value: item };
  },
  listCategories: async () => ({ ok: true, value: categoryRecords() }),
  listItems: async () => ({ ok: true, value: itemRecords() }),
  listModifierGroups: async () => ({ ok: true, value: [] as ModifierGroupRecord[] }),
  listCombos: async () => ({ ok: true, value: comboRecords() }),
  search: async (query): Promise<import('../core/result').SdkResult<MenuSearchRecordResult>> => ({
    ok: true,
    value: {
      hits: [
        {
          item: itemRecords()[0]!,
          score: 1,
          matchedFields: ['name'],
        },
      ],
      categories: categoryRecords().filter((category) => category.active),
      totalHits: 1,
      queryText: query.text,
    },
  }),
  ...overrides,
});

describe('Menu repository foundation (M7 PR-3)', () => {
  it('createMenuRepository returns stub when flag is off', async () => {
    const repository = createMenuRepository();
    const result = await repository.getMenu({ tenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createMenuRepository uses injected repository first', async () => {
    const injected = createStubMenuRepository();
    const repository = createMenuRepository({ repository: injected });
    const result = await repository.listCategories({ tenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.details?.provider, 'StubMenuRepository');
  });

  it('createMenuRepository uses adapter when flag on and persistence port provided', async () => {
    const repository = createMenuRepository({
      featureFlags: () => true,
      persistencePort: createMockPersistencePort(),
    });
    const result = await repository.getMenu({ tenantId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.menuId, 'menu-1');
    assert.equal(result.value.items.length, 1);
    assert.equal(result.value.categories.length, 2);
  });

  it('adapter orders categories by sortOrder', async () => {
    const repository = createMenuRepositoryAdapter(createMockPersistencePort());
    const result = await repository.listCategories({ tenantId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.value.map((category) => category.categoryId),
      ['cat-1', 'cat-2']
    );
  });

  it('adapter filters inactive categories by default', async () => {
    const repository = createMenuRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getMenu({ tenantId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.categories.length, 2);
    assert.ok(result.value.categories.every((category) => category.active));
  });

  it('adapter includes inactive records when includeInactive is true', async () => {
    const repository = createMenuRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getMenu({ tenantId, includeInactive: true });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.categories.length, 3);
    assert.equal(result.value.items.length, 2);
  });

  it('adapter maps getMenuItem from persistence port', async () => {
    const repository = createMenuRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getMenuItem({
      tenantId,
      itemId: 'item-1' as MenuItemId,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, 'Thali');
    assert.equal(result.value.price.amount, 120);
  });

  it('adapter returns NOT_FOUND for missing combo', async () => {
    const repository = createMenuRepositoryAdapter(createMockPersistencePort());
    const result = await repository.getCombo({
      tenantId,
      comboId: 'missing' as ComboId,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('mapPersistenceError preserves known infrastructure codes', () => {
    const mapped = mapPersistenceError(sdkError('NOT_FOUND', 'missing'));
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'NOT_FOUND');
  });

  it('mapPersistenceError maps unknown codes to UNAVAILABLE', () => {
    const mapped = mapPersistenceError(sdkError('INTERNAL', 'db down'));
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'UNAVAILABLE');
  });

  it('mapper converts persistence records to SDK DTOs', () => {
    const menu = mapMenuRecordToMenu(menuRecord(), categoryRecords(), itemRecords());
    assert.equal(menu.metadata.itemCount, 2);
    assert.equal(menu.categories[0]?.categoryId, 'cat-2');

    const item = mapMenuItemRecord(itemRecords()[0]!);
    assert.equal(item.itemId, 'item-1');

    const combo = mapComboRecord(comboRecords()[0]!);
    assert.equal(combo.comboId, 'combo-1');
  });

  it('sortCategoryRecords and filter helpers are deterministic', () => {
    const sorted = sortCategoryRecords(categoryRecords());
    assert.equal(sorted[0]?.categoryId, 'cat-1');
    const activeOnly = filterActiveCategoryRecords(categoryRecords());
    assert.equal(activeOnly.length, 2);
    const activeItems = filterActiveItemRecords(itemRecords());
    assert.equal(activeItems.length, 1);
  });

  it('mapMenuSearchRecordResult maps search hits', () => {
    const result = mapMenuSearchRecordResult({
      hits: [{ item: itemRecords()[0]!, score: 0.9, matchedFields: ['name'] }],
      categories: [categoryRecords()[0]!],
      totalHits: 1,
      queryText: 'thali',
    });
    assert.equal(result.totalHits, 1);
    assert.equal(result.hits[0]?.item.name, 'Thali');
  });

  it('mapCategoryRecord preserves fields', () => {
    const category = mapCategoryRecord(categoryRecords()[1]!);
    assert.equal(category.name, 'Mains');
    assert.equal(category.sortOrder, 1);
  });
});
